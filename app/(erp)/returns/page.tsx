import { requirePagePermission } from "../../../lib/auth/session";
import { getReturnMetrics, RETURN_REASON_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from "../../../modules/returns/service";
import { listReturns } from "../../../modules/returns/store";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import ReturnsTable from "../_components/ReturnsTable";

export const dynamic = "force-dynamic";

export default async function ReturnsPage({ searchParams }: { searchParams: { status?: string } }) {
  await requirePagePermission("orders.view");

  const metrics = getReturnMetrics().map((metric) => ({
    ...metric,
    href: metric.label === "Awaiting review" ? "/returns?status=requested" : metric.label === "Refunded" ? "/returns?status=refunded" : "/returns",
  }));
  const rows = listReturns();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Returns</p>
          <h1>Every return, tracked end to end.</h1>
          <p>Requested by the customer or by staff, approved, received back into stock, then refunded — one workflow instead of a side conversation.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="returns.csv"
            rows={rows.map((row) => ({
              returnNumber: row.returnNumber,
              orderNumber: row.orderNumber,
              customer: row.customer,
              reason: RETURN_REASON_LABEL[row.reason],
              status: row.status,
              refundAmount: row.refundAmount,
              requestedAt: row.createdAt,
            }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Return metrics" />

      <ReturnsTable rows={rows} statusLabel={RETURN_STATUS_LABEL} statusTone={RETURN_STATUS_TONE} reasonLabel={RETURN_REASON_LABEL} initialStatus={searchParams.status} />
    </>
  );
}
