import { requirePagePermission } from "../../../lib/auth/session";
import { getCrmMetrics, getCustomerRows } from "../../../modules/crm/service";
import CustomersTable from "../_components/CustomersTable";

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
      </section>

      <section className="metric-grid" aria-label="Customer metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <CustomersTable rows={rows} segmentLabel={SEGMENT_LABEL} segmentTone={SEGMENT_TONE} />
    </>
  );
}
