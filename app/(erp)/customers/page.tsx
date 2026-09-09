import { requirePagePermission } from "../../../lib/auth/session";
import { getCrmMetrics, getCustomerRows } from "../../../modules/crm/service";
import CustomersTable from "../_components/CustomersTable";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";

export const dynamic = "force-dynamic";

const SEGMENT_LABEL = { vip: "VIP", returning: "Returning", new: "New" } as const;
const SEGMENT_TONE = { vip: "positive", returning: "neutral", new: "warning" } as const;

export default async function CustomersPage() {
  await requirePagePermission("crm.view");

  const metrics = getCrmMetrics();
  const rows = getCustomerRows();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Customers</p>
          <h1>Every relationship, in context.</h1>
          <p>Derived live from real orders — every customer here has actually placed at least one order.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="customers.csv"
            rows={rows.map((row) => ({
              name: row.name,
              segment: SEGMENT_LABEL[row.segment],
              orders: row.orderCount,
              lifetimeValue: row.lifetimeValue,
              lastOrderAt: row.lastOrderAt,
              channels: row.channels.join("; "),
            }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Customer metrics" />

      <CustomersTable rows={rows} segmentLabel={SEGMENT_LABEL} segmentTone={SEGMENT_TONE} />
    </>
  );
}
