import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Trend } from "../../../modules/shared/trend";

export interface MetricCardData {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
  /** Where the transactions behind this number actually live -- turns the card into a link instead of a dead-end summary. */
  href?: string;
}

function TrendBadge({ trend }: { trend: Trend }) {
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  return (
    <span className={`metric-trend ${trend.tone}`} title={trend.label}>
      <Icon size={12} strokeWidth={2.25} />
    </span>
  );
}

function CardBody({ metric }: { metric: MetricCardData }) {
  return (
    <>
      <div className="metric-label">
        <span>{metric.label}</span>
        {metric.trend && <TrendBadge trend={metric.trend} />}
      </div>
      <strong>{metric.value}</strong>
      <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
      {metric.href && (
        <span className="metric-drill">
          View transactions <ArrowRight size={11} />
        </span>
      )}
    </>
  );
}

export default function MetricGrid({ metrics, label = "Key metrics" }: { metrics: MetricCardData[]; label?: string }) {
  return (
    <section className="metric-grid" aria-label={label}>
      {metrics.map((metric) =>
        metric.href ? (
          <Link className="metric-card linked" href={metric.href} key={metric.label}>
            <CardBody metric={metric} />
          </Link>
        ) : (
          <article className="metric-card" key={metric.label}>
            <CardBody metric={metric} />
          </article>
        )
      )}
    </section>
  );
}
