import type { SandboxRole } from "../authentication/domain";

export type LifecycleCaseKind = "onboarding" | "offboarding";
export type LifecycleCaseStatus = "in_progress" | "completed";

export interface LifecycleStep {
  id: string;
  label: string;
  category: string;
  required: boolean;
  completedAt: string | null;
  completedById: string | null;
  completedByName: string | null;
}

export interface LifecycleCase {
  id: string;
  kind: LifecycleCaseKind;
  memberId: string;
  memberName: string;
  role: SandboxRole;
  department: string;
  status: LifecycleCaseStatus;
  /** Offboarding only -- why the exit was initiated. */
  reason: string | null;
  startedAt: string;
  startedById: string;
  startedByName: string;
  completedAt: string | null;
  steps: LifecycleStep[];
}
