import { requirePagePermission } from "../../../lib/auth/session";
import { getReturnMetrics, RETURN_REASON_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from "../../../modules/returns/service";
import { listReturns } from "../../../modules/returns/store";
import ReturnsTable from "../_components/ReturnsTable";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  await requirePagePermission("orders.view");

  const metrics = getReturnMetrics();
  const rows = listReturns();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Returns</p>
          <h1>Every return, tracked end to end.</h1>
          <p>Requested by the customer or by staff, approved, received back into stock, then refunded — one workflow instead of a side conversation.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Return metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <ReturnsTable rows={rows} statusLabel={RETURN_STATUS_LABEL} statusTone={RETURN_STATUS_TONE} reasonLabel={RETURN_REASON_LABEL} />
    </>
  );
}
