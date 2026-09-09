"use client";

import { useState } from "react";
import type { OrderStatusShare } from "../../../../modules/analytics/service";

const STATUS_COLORS = ["var(--chart-status-1)", "var(--chart-status-2)", "var(--chart-status-3)", "var(--chart-status-4)", "var(--chart-status-5)"];

export default function OrderStatusBreakdownChart({ rows }: { rows: OrderStatusShare[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hasOrders = rows.some((row) => row.count > 0);

  if (!hasOrders) {
    return <p className="chart-empty">No orders yet — the status breakdown will appear here.</p>;
  }

  return (
    <div>
      <div className="split-bar" role="img" aria-label="Orders by status">
        {rows.map((row, index) => (
          <div
            key={row.status}
            className={`split-bar-segment${hovered === index ? " active" : ""}`}
            style={{ width: `${Math.max(row.share, row.count > 0 ? 2 : 0)}%`, background: STATUS_COLORS[index] }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
          />
        ))}
      </div>

      <div className="split-legend">
        {rows.map((row, index) => (
          <div className={`split-legend-item${hovered === index ? " active" : ""}`} key={row.status}>
            <span className="split-legend-swatch" style={{ background: STATUS_COLORS[index] }} />
            <strong>{row.label}</strong>
            <span className="split-legend-share">{row.share}%</span>
            <small>{row.count} order{row.count === 1 ? "" : "s"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
