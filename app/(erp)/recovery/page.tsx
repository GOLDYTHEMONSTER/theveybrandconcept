import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import { getAbandonedCheckouts } from "../../../modules/orders/store";
import { getRecoveryMetrics } from "../../../modules/recovery/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
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
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="abandoned-checkouts.csv"
            rows={rows.map((row) => ({ orderNumber: row.orderNumber, customer: row.customer, email: row.customerEmail ?? "", total: row.total, createdAt: row.createdAt }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Recovery metrics" />

      <RecoveryTable rows={rows} canRelease={session.permissions.includes("orders.cancel")} />
    </>
  );
}
