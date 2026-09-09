import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import { getAbandonedCheckouts } from "../../../modules/orders/store";
import { getRecoveryMetrics } from "../../../modules/recovery/service";
import RecoveryTable from "../_components/RecoveryTable";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  await requirePagePermission("orders.view");
  const session = await getSessionContext();

  const metrics = getRecoveryMetrics();
  const rows = getAbandonedCheckouts();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Recovery</p>
          <h1>Abandoned checkouts.</h1>
          <p>A customer reached payment and never finished it — their stock is still reserved until you send a recovery link or release it back to inventory.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Recovery metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <RecoveryTable rows={rows} canRelease={session.permissions.includes("orders.cancel")} />
    </>
  );
}
