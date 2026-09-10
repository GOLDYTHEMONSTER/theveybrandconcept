import { listTasksForAssignee } from "../tasks/store";
import { listCases, type LifecycleCase } from "./store";
import type { MetricCardData } from "../../app/(erp)/_components/MetricGrid";

export interface LifecycleCaseRow {
  id: string;
  kind: LifecycleCase["kind"];
  memberId: string;
  memberName: string;
  role: string;
  department: string;
  status: LifecycleCase["status"];
  reason: string | null;
  startedAt: string;
  completedAt: string | null;
  stepsDone: number;
  stepsTotal: number;
}

function toRow(lifecycleCase: LifecycleCase): LifecycleCaseRow {
  const requiredSteps = lifecycleCase.steps.filter((step) => step.required);
  return {
    id: lifecycleCase.id,
    kind: lifecycleCase.kind,
    memberId: lifecycleCase.memberId,
    memberName: lifecycleCase.memberName,
    role: lifecycleCase.role,
    department: lifecycleCase.department,
    status: lifecycleCase.status,
    reason: lifecycleCase.reason,
    startedAt: lifecycleCase.startedAt,
    completedAt: lifecycleCase.completedAt,
    stepsDone: requiredSteps.filter((step) => step.completedAt !== null).length,
    stepsTotal: requiredSteps.length,
  };
}

export function getOnboardingRows(): LifecycleCaseRow[] {
  return listCases("onboarding").map(toRow);
}

export function getOffboardingRows(): LifecycleCaseRow[] {
  return listCases("offboarding").map(toRow);
}

/** The one step whose "done" state isn't a checkbox someone ticks -- it reflects real, live task-reassignment count. */
export function getOpenTaskCountForMember(memberId: string): number {
  return listTasksForAssignee(memberId).filter((task) => task.status === "todo" || task.status === "in_progress").length;
}

export function getLifecycleMetrics(): MetricCardData[] {
  const onboarding = listCases("onboarding");
  const offboarding = listCases("offboarding");
  const onboardingActive = onboarding.filter((c) => c.status === "in_progress");
  const offboardingActive = offboarding.filter((c) => c.status === "in_progress");
  const completedOnboarding = onboarding.filter((c) => c.status === "completed" && c.completedAt);

  const avgOnboardingDays = completedOnboarding.length
    ? completedOnboarding.reduce((sum, c) => sum + (new Date(c.completedAt!).getTime() - new Date(c.startedAt).getTime()), 0) /
      completedOnboarding.length /
      (24 * 3600_000)
    : 0;

  return [
    { label: "Onboarding in progress", value: String(onboardingActive.length), change: "New hires mid-checklist", tone: "neutral", href: "/onboarding" },
    { label: "Offboarding in progress", value: String(offboardingActive.length), change: offboardingActive.length ? "Access already revoked" : "None right now", tone: offboardingActive.length ? "warning" : "positive", href: "/onboarding" },
    { label: "Avg. time to onboard", value: completedOnboarding.length ? `${avgOnboardingDays.toFixed(1)}d` : "—", change: `${completedOnboarding.length} completed`, tone: "neutral" },
    { label: "Total lifecycle cases", value: String(onboarding.length + offboarding.length), change: "All time", tone: "neutral" },
  ];
}
