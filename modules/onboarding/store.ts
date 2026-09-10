import { randomUUID } from "crypto";
import { recordAudit } from "../audit/sandbox-log";
import type { SandboxRole } from "../authentication/domain";
import { createNotification } from "../notifications/store";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import { getTeamMember, setMemberStatus } from "../team/store";
import type { LifecycleCase, LifecycleCaseKind, LifecycleStep } from "./domain";

export type { LifecycleCase, LifecycleCaseKind, LifecycleCaseStatus, LifecycleStep } from "./domain";

const globalLifecycle = globalThis as typeof globalThis & { __veyLifecycleCases?: LifecycleCase[] };
if (!globalLifecycle.__veyLifecycleCases) {
  globalLifecycle.__veyLifecycleCases = [];
}

function store(): LifecycleCase[] {
  return globalLifecycle.__veyLifecycleCases!;
}

function newStep(label: string, category: string, required = true): LifecycleStep {
  return { id: randomUUID(), label, category, required, completedAt: null, completedById: null, completedByName: null };
}

const ROLE_ONBOARDING_STEP: Record<SandboxRole, string | null> = {
  executive: null,
  sales_manager: "Complete CRM & checkout-flow walkthrough",
  warehouse_manager: "Complete warehouse safety induction",
  customer_support: "Complete returns & refund policy training",
  hr_manager: "Complete payroll & permissions-review walkthrough",
};

/**
 * A fixed checklist per case kind, not something staff configure -- if
 * this needs to vary by department later, that's a real feature, not a
 * setting. Role-specific onboarding steps stay optional (required: false)
 * since not every hire needs one and a missing checklist item shouldn't
 * be what blocks someone's first day.
 */
function onboardingSteps(role: SandboxRole): LifecycleStep[] {
  const steps = [
    newStep("Confirm login and set up your profile", "account"),
    newStep("Review the employee handbook & policies", "compliance"),
    newStep("Sign the confidentiality agreement", "compliance"),
    newStep("Meet your manager and team", "team"),
    newStep("Workstation / equipment issued", "equipment"),
  ];
  const roleStep = ROLE_ONBOARDING_STEP[role];
  if (roleStep) steps.push(newStep(roleStep, "training", false));
  return steps;
}

function offboardingSteps(): LifecycleStep[] {
  return [
    newStep("System access revoked", "access"),
    newStep("Open tasks reassigned to a new owner", "handover"),
    newStep("Equipment & access badges returned", "assets"),
    newStep("Exit interview conducted", "compliance"),
    newStep("Final settlement processed", "compliance"),
  ];
}

export function listCases(kind?: LifecycleCaseKind): LifecycleCase[] {
  return [...store()]
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function getCase(id: string): LifecycleCase {
  const found = store().find((item) => item.id === id);
  if (!found) throw new NotFoundError("Case not found");
  return found;
}

export function getOpenCaseForMember(memberId: string, kind: LifecycleCaseKind): LifecycleCase | undefined {
  return store().find((item) => item.memberId === memberId && item.kind === kind && item.status === "in_progress");
}

export function startOnboarding(memberId: string, actorId: string, actorName: string): LifecycleCase {
  const member = getTeamMember(memberId);
  if (getOpenCaseForMember(memberId, "onboarding")) throw new ConflictError("This person already has an onboarding case in progress");

  const lifecycleCase: LifecycleCase = {
    id: randomUUID(),
    kind: "onboarding",
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    department: member.department,
    status: "in_progress",
    reason: null,
    startedAt: new Date().toISOString(),
    startedById: actorId,
    startedByName: actorName,
    completedAt: null,
    steps: onboardingSteps(member.role),
  };
  store().push(lifecycleCase);

  recordAudit({
    action: "onboarding.start",
    entityType: "team_member",
    entityId: member.id,
    actorId,
    actorName,
    afterValue: { caseId: lifecycleCase.id, role: member.role },
  });

  createNotification({
    audienceRoles: ["executive", "hr_manager"],
    type: "onboarding.started",
    title: "Onboarding started",
    message: `${member.name} is onboarding as ${member.role.replace("_", " ")}`,
    href: `/onboarding/${lifecycleCase.id}`,
  });

  return lifecycleCase;
}

/**
 * Access is cut the instant this runs -- setMemberStatus("offboarding")
 * makes the account unable to log in at all (see LOCKED_OUT_STATUSES in
 * modules/team/store.ts) before a single checklist step exists. The
 * checklist that follows is the administrative cleanup, not the security
 * boundary; the boundary already happened.
 */
export function startOffboarding(memberId: string, reason: string, actorId: string, actorName: string): LifecycleCase {
  const member = getTeamMember(memberId);
  if (getOpenCaseForMember(memberId, "offboarding")) throw new ConflictError("This person already has an offboarding case in progress");
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) throw new ValidationError("A reason is required to start offboarding");

  setMemberStatus(memberId, "offboarding", actorId);

  const steps = offboardingSteps();
  const accessStep = steps.find((step) => step.category === "access")!;
  accessStep.completedAt = new Date().toISOString();
  accessStep.completedById = actorId;
  accessStep.completedByName = actorName;

  const lifecycleCase: LifecycleCase = {
    id: randomUUID(),
    kind: "offboarding",
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    department: member.department,
    status: "in_progress",
    reason: trimmedReason,
    startedAt: new Date().toISOString(),
    startedById: actorId,
    startedByName: actorName,
    completedAt: null,
    steps,
  };
  store().push(lifecycleCase);

  recordAudit({
    action: "offboarding.start",
    entityType: "team_member",
    entityId: member.id,
    actorId,
    actorName,
    reason: trimmedReason,
    afterValue: { caseId: lifecycleCase.id, accessRevokedAt: accessStep.completedAt },
  });

  createNotification({
    audienceRoles: ["executive", "hr_manager"],
    type: "offboarding.started",
    title: "Offboarding started",
    message: `${member.name}'s access was revoked and offboarding began — ${trimmedReason}`,
    href: `/onboarding/${lifecycleCase.id}`,
  });

  return lifecycleCase;
}

function allRequiredStepsDone(lifecycleCase: LifecycleCase): boolean {
  return lifecycleCase.steps.filter((step) => step.required).every((step) => step.completedAt !== null);
}

export function completeStep(caseId: string, stepId: string, actorId: string, actorName: string): LifecycleCase {
  const lifecycleCase = getCase(caseId);
  if (lifecycleCase.status === "completed") throw new ValidationError("This case is already complete");
  const step = lifecycleCase.steps.find((item) => item.id === stepId);
  if (!step) throw new NotFoundError("Step not found");
  if (step.completedAt) return lifecycleCase;

  step.completedAt = new Date().toISOString();
  step.completedById = actorId;
  step.completedByName = actorName;

  recordAudit({
    action: lifecycleCase.kind === "onboarding" ? "onboarding.step_complete" : "offboarding.step_complete",
    entityType: "team_member",
    entityId: lifecycleCase.memberId,
    actorId,
    actorName,
    afterValue: { caseId, step: step.label },
  });

  if (allRequiredStepsDone(lifecycleCase)) {
    lifecycleCase.status = "completed";
    lifecycleCase.completedAt = new Date().toISOString();

    if (lifecycleCase.kind === "onboarding") {
      setMemberStatus(lifecycleCase.memberId, "active", actorId);
      createNotification({
        audienceRoles: [lifecycleCase.role],
        type: "onboarding.completed",
        title: "Onboarding complete",
        message: `Welcome aboard — your full access is now active.`,
        href: "/dashboard",
      });
    } else {
      setMemberStatus(lifecycleCase.memberId, "terminated", actorId);
      createNotification({
        audienceRoles: ["executive", "hr_manager"],
        type: "offboarding.completed",
        title: "Offboarding complete",
        message: `${lifecycleCase.memberName}'s offboarding is complete.`,
        href: `/onboarding/${lifecycleCase.id}`,
      });
    }

    recordAudit({
      action: lifecycleCase.kind === "onboarding" ? "onboarding.complete" : "offboarding.complete",
      entityType: "team_member",
      entityId: lifecycleCase.memberId,
      actorId,
      actorName,
      afterValue: { caseId },
    });
  }

  return lifecycleCase;
}
