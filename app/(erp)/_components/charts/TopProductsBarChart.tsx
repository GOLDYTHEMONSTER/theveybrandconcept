"use client";

import { useState } from "react";

interface TopProductsBarChartProps {
  rows: Array<{ label: string; revenue: number; units: number }>;
}

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function TopProductsBarChart({ rows }: TopProductsBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...rows.map((row) => row.revenue), 1);

  if (rows.length === 0) {
    return <p className="chart-empty">No completed orders yet — revenue by product will appear here.</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label="Revenue by product">
      {rows.map((row, index) => {
        const widthPercent = Math.max((row.revenue / max) * 100, 3);
        return (
          <div
            className="bar-chart-row"
            key={row.label}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
          >
            <span className="bar-chart-label">{row.label}</span>
            <div className="bar-chart-track">
              <div
                className={`bar-chart-fill${hovered === index ? " active" : ""}`}
                style={{ width: `${widthPercent}%` }}
              />
              {hovered === index && (
                <div className="chart-tooltip bar-chart-tooltip" style={{ left: `${widthPercent}%` }}>
                  <strong>{currency.format(row.revenue)}</strong>
                  <span>{row.units} unit{row.units === 1 ? "" : "s"} sold</span>
                </div>
              )}
            </div>
            <span className="bar-chart-value">{currency.format(row.revenue)}</span>
          </div>
        );
      })}
    </div>
  );
}
