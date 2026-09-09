import { listReturns } from "./store";
import type { ReturnReason, ReturnStatus } from "./domain";

export interface ReturnMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  refunded: "Refunded",
};

export const RETURN_STATUS_TONE: Record<ReturnStatus, string> = {
  requested: "warning",
  approved: "neutral",
  rejected: "negative",
  received: "neutral",
  refunded: "positive",
};

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  wrong_size: "Wrong size",
  damaged: "Arrived damaged",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  other: "Other",
};

export function getReturnMetrics(): ReturnMetric[] {
  const rows = listReturns();
  const pending = rows.filter((r) => r.status === "requested").length;
  const inProgress = rows.filter((r) => r.status === "approved").length;
  const refunded = rows.filter((r) => r.status === "refunded");
  const refundedTotal = refunded.reduce((sum, r) => sum + r.refundAmount, 0);

  return [
    { label: "Awaiting review", value: String(pending), change: pending ? "Needs a decision" : "All caught up", tone: pending ? "warning" : "positive" },
    { label: "Approved, awaiting return", value: String(inProgress), change: "Waiting on the package", tone: "neutral" },
    { label: "Refunded", value: String(refunded.length), change: `₦${(refundedTotal / 1000).toFixed(0)}k returned`, tone: "neutral" },
    { label: "Total requests", value: String(rows.length), change: "All time", tone: "neutral" },
  ];
}
