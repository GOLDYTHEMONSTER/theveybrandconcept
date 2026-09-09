import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Trend } from "../../../modules/shared/trend";

export interface MetricCardData {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
}

function TrendBadge({ trend }: { trend: Trend }) {
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  return (
    <span className={`metric-trend ${trend.tone}`} title={trend.label}>
      <Icon size={12} strokeWidth={2.25} />
    </span>
  );
}

export default function MetricGrid({ metrics, label = "Key metrics" }: { metrics: MetricCardData[]; label?: string }) {
  return (
    <section className="metric-grid" aria-label={label}>
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <div className="metric-label">
            <span>{metric.label}</span>
            {metric.trend && <TrendBadge trend={metric.trend} />}
          </div>
          <strong>{metric.value}</strong>
          <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
        </article>
      ))}
    </section>
  );
}
