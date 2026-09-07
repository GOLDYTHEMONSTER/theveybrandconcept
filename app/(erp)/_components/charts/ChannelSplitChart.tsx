"use client";

import { useState } from "react";

interface ChannelSplitChartProps {
  rows: Array<{ label: string; revenue: number; share: number }>;
}

const CHANNEL_COLORS = ["var(--chart-cat-1)", "var(--chart-cat-2)"];
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function ChannelSplitChart({ rows }: ChannelSplitChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (rows.length === 0) {
    return <p className="chart-empty">No completed orders yet — channel split will appear here.</p>;
  }

  return (
    <div>
      <div className="split-bar" role="img" aria-label="Revenue share by channel">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`split-bar-segment${hovered === index ? " active" : ""}`}
            style={{ width: `${Math.max(row.share, 2)}%`, background: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
          />
        ))}
      </div>

      <div className="split-legend">
        {rows.map((row, index) => (
          <div className={`split-legend-item${hovered === index ? " active" : ""}`} key={row.label}>
            <span className="split-legend-swatch" style={{ background: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }} />
            <strong>{row.label}</strong>
            <span className="split-legend-share">{row.share}%</span>
            <small>{currency.format(row.revenue)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
