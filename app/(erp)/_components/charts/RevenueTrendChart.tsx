"use client";

import { useRef, useState } from "react";

interface RevenueTrendChartProps {
  points: Array<{ label: string; value: number }>;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function RevenueTrendChart({ points }: RevenueTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...points.map((p) => p.value), 1);
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PAD_LEFT + stepX * index,
    y: PAD_TOP + plotHeight - (point.value / max) * plotHeight,
    ...point,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x.toFixed(1)},${PAD_TOP + plotHeight} L${coords[0]?.x.toFixed(1)},${PAD_TOP + plotHeight} Z`;

  const gridLines = [0, 0.5, 1].map((fraction) => PAD_TOP + plotHeight * fraction);

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || coords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDistance = Infinity;
    coords.forEach((c, index) => {
      const distance = Math.abs(c.x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    setHoverIndex(closest);
  }

  const active = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="chart-root">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart-svg"
        role="img"
        aria-label="Revenue trend over the last week"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((y) => (
          <line key={y} x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} className="chart-gridline" />
        ))}

        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-seq-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-seq-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#revenueFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--chart-seq-600)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((c, index) => (
          <circle
            key={c.label + index}
            cx={c.x}
            cy={c.y}
            r={index === coords.length - 1 || hoverIndex === index ? 4 : 0}
            fill="var(--chart-seq-600)"
            stroke="var(--chart-surface)"
            strokeWidth={1.5}
          />
        ))}

        {active && (
          <line x1={active.x} x2={active.x} y1={PAD_TOP} y2={PAD_TOP + plotHeight} className="chart-crosshair" />
        )}

        {coords.map((c, index) => (
          <text key={c.label} x={c.x} y={HEIGHT - 8} textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"} className="chart-axis-label">
            {c.label}
          </text>
        ))}
      </svg>

      {active && (
        <div
          className="chart-tooltip"
          style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
        >
          <strong>{currency.format(active.value)}</strong>
          <span>{active.label}</span>
        </div>
      )}
    </div>
  );
}
