const STANDARD_CHART: Array<{ size: string; bust: number; waist: number; hip: number }> = [
  { size: "XS", bust: 32, waist: 24, hip: 34 },
  { size: "S", bust: 34, waist: 26, hip: 36 },
  { size: "M", bust: 36, waist: 28, hip: 38 },
  { size: "L", bust: 38, waist: 30, hip: 40 },
  { size: "XL", bust: 40, waist: 32, hip: 42 },
];

export default function SizeChart({ sizes }: { sizes: string[] }) {
  if (sizes.length === 0) return null;
  const rows = STANDARD_CHART.filter((row) => sizes.includes(row.size));
  const visibleRows = rows.length ? rows : STANDARD_CHART;

  return (
    <details className="group mt-6 border-t border-hairline pt-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
        Size chart
        <span className="text-[10px] text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="text-muted">
              <th className="pb-2 pr-4 font-normal">Size</th>
              <th className="pb-2 pr-4 font-normal">Bust (in)</th>
              <th className="pb-2 pr-4 font-normal">Waist (in)</th>
              <th className="pb-2 font-normal">Hip (in)</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.size} className="border-t border-hairline text-ink">
                <td className="py-2 pr-4">{row.size}</td>
                <td className="py-2 pr-4">{row.bust}</td>
                <td className="py-2 pr-4">{row.waist}</td>
                <td className="py-2">{row.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted">Measurements are body measurements, in inches. Between sizes? Size up for a relaxed fit.</p>
    </details>
  );
}
