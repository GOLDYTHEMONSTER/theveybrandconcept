import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../lib/auth/session";
import { listOrders } from "../../../modules/orders/store";
import OrdersTable from "../_components/OrdersTable";

const STATUS_LABEL = { pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" } as const;
const STATUS_TONE = { pending: "warning", processing: "neutral", shipped: "neutral", delivered: "positive", cancelled: "negative" } as const;

export default async function OrdersPage() {
  await requirePagePermission("orders.view");
  const session = await getSessionContext();

  const rows = listOrders();
  const pending = rows.filter((row) => row.status === "pending").length;
  const processing = rows.filter((row) => row.status === "processing").length;
  const revenue = rows.filter((row) => row.status !== "cancelled").reduce((sum, row) => sum + row.total, 0);
  const canCreate = session.permissions.includes("orders.create");

  const metrics = [
    { label: "Orders today", value: String(rows.length), change: `${pending} awaiting confirmation`, tone: pending ? "warning" : "positive" },
    { label: "Ready to pack", value: String(processing), change: "Warehouse queue", tone: "neutral" },
    { label: "Revenue booked", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: "Excludes cancelled orders", tone: "positive" },
    { label: "Cancelled", value: String(rows.filter((row) => row.status === "cancelled").length), change: "This week", tone: "neutral" },
  ] as const;

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Orders</p>
          <h1>Every order, one workflow.</h1>
          <p>From confirmation through delivery — order status, payment status and fulfilment all stay in sync in one place.</p>
        </div>
        {canCreate && (
          <div className="erp-hero-actions">
            <Link className="erp-button primary" href="/orders/new">Create order <span>＋</span></Link>
          </div>
        )}
      </section>

      <section className="metric-grid" aria-label="Order metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <OrdersTable rows={rows} statusLabel={STATUS_LABEL} statusTone={STATUS_TONE} />
    </>
  );
}
