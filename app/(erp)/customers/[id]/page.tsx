import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../../lib/auth/session";
import { getCustomerDetail, getCustomerSegmentLabel, getCustomerSegmentTone } from "../../../../modules/crm/service";
import CustomerNotesForm from "../../_components/CustomerNotesForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" } as const;
const STATUS_TONE = { pending: "warning", processing: "neutral", shipped: "neutral", delivered: "positive", cancelled: "negative" } as const;
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requirePagePermission("crm.view");
  const session = await getSessionContext();

  const customer = getCustomerDetail(decodeURIComponent(params.id));
  if (!customer) notFound();

  const canManage = session.permissions.includes("crm.manage");

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Customer</p>
          <h1>{customer.name}</h1>
          <p>{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"} · {customer.channels.join(", ")}</p>
        </div>
        <div className="erp-hero-actions">
          <span className={`status-pill ${getCustomerSegmentTone(customer.segment)}`} style={{ alignSelf: "center" }}>
            {getCustomerSegmentLabel(customer.segment)}{customer.hasVipOverride ? " · Manual" : ""}
          </span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">History</p><h2>Order history</h2></div></div>
          <div className="erp-table-wrap" style={{ margin: 0 }}>
            <table className="erp-table">
              <thead>
                <tr><th>Order</th><th>Channel</th><th>Status</th><th className="numeric">Total</th><th>Placed</th></tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td><Link href={`/orders/${order.id}`}><strong>#{order.orderNumber}</strong></Link></td>
                    <td>{order.channel}</td>
                    <td><span className={`status-pill ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span></td>
                    <td className="numeric">{currency.format(order.total)}</td>
                    <td>{new Date(order.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 4px 0", gap: 24 }}>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Lifetime value</span>
            <strong style={{ font: "500 20px 'Playfair Display', serif" }}>{currency.format(customer.lifetimeValue)}</strong>
          </div>
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Account</p><h2>Notes &amp; segment</h2></div></div>
          {canManage ? (
            <CustomerNotesForm customerId={customer.id} note={customer.note} vipOverride={customer.hasVipOverride ? customer.segment === "vip" : null} />
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>{customer.note || "No notes yet."}</p>
          )}
        </article>
      </section>
    </>
  );
}
