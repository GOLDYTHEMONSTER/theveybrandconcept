import { getAbandonedCheckouts } from "../orders/store";

export interface RecoveryMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

export function getRecoveryMetrics(): RecoveryMetric[] {
  const rows = getAbandonedCheckouts();
  const totalAtRisk = rows.reduce((sum, order) => sum + order.total, 0);
  const oldestHours = rows.length ? (Date.now() - new Date(rows[0].createdAt).getTime()) / 3_600_000 : 0;

  return [
    { label: "Abandoned checkouts", value: String(rows.length), change: rows.length ? "Payment never completed" : "None right now", tone: rows.length ? "warning" : "positive" },
    { label: "Value at risk", value: `₦${(totalAtRisk / 1000).toFixed(0)}k`, change: "Stock still reserved", tone: rows.length ? "warning" : "neutral" },
    { label: "Oldest", value: rows.length ? `${Math.round(oldestHours)}h ago` : "—", change: "Since checkout started", tone: "neutral" },
  ];
}
