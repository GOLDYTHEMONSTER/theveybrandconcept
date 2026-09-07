import { notFound } from "next/navigation";
import { getSessionContext, requirePagePermission } from "../../../../lib/auth/session";
import { getOrder, getShipment } from "../../../../modules/orders/store";
import OrderActions from "../../_components/OrderActions";
import CopyLink from "../../_components/CopyLink";

const STATUS_LABEL = { pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" } as const;
const STATUS_TONE = { pending: "warning", processing: "neutral", shipped: "neutral", delivered: "positive", cancelled: "negative" } as const;
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requirePagePermission("orders.view");
  const session = await getSessionContext();

  const order = getOrder(params.id);
  if (!order) notFound();

  const shipment = order.shipmentId ? getShipment(order.shipmentId) : undefined;

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Order #{order.orderNumber}</p>
          <h1>{order.customer}</h1>
          <p>{order.channel} · Placed {new Date(order.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="erp-hero-actions">
          <span className={`status-pill ${STATUS_TONE[order.status]}`} style={{ alignSelf: "center" }}>{STATUS_LABEL[order.status]}</span>
        </div>
      </section>

      <OrderActions
        orderId={order.id}
        status={order.status}
        canFulfil={session.permissions.includes("orders.fulfil")}
        canCancel={session.permissions.includes("orders.cancel")}
        hasShipment={Boolean(shipment)}
      />

      <section className="dashboard-grid" style={{ marginTop: 24 }}>
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Items</p><h2>Order contents</h2></div></div>
          <div className="erp-table-wrap" style={{ margin: 0 }}>
            <table className="erp-table">
              <thead>
                <tr><th>Product</th><th className="numeric">Qty</th><th className="numeric">Unit price</th><th className="numeric">Total</th></tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.variantId}>
                    <td><strong>{item.productName}</strong><small>{item.variantLabel} · {item.sku} · {item.warehouse}</small></td>
                    <td className="numeric">{item.quantity}</td>
                    <td className="numeric">{currency.format(item.unitPrice)}</td>
                    <td className="numeric">{currency.format(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 4px 0", gap: 24 }}>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Order total</span>
            <strong style={{ font: "500 20px 'Playfair Display', serif" }}>{currency.format(order.total)}</strong>
          </div>

          {shipment && (
            <div style={{ marginTop: 28, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
              <div className="panel-heading">
                <div><p className="erp-eyebrow">Tracking</p><h2>{shipment.carrier} · {shipment.trackingNumber}</h2></div>
                <CopyLink path={`/track/${shipment.publicToken}`} />
              </div>
              <div className="activity-list">
                {[...shipment.events].reverse().map((event) => (
                  <div className="activity-row" key={event.id}>
                    <span className="activity-mark">{event.status.slice(0, 1)}</span>
                    <div><strong>{event.status}</strong><small>{event.message}{event.location ? ` · ${event.location}` : ""}</small></div>
                    <span className="activity-tag" />
                    <time>{new Date(event.occurredAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">History</p><h2>Status timeline</h2></div></div>
          <div className="focus-list">
            {[...order.events].reverse().map((event) => (
              <div className="focus-row" key={event.id}>
                <span className="focus-index">●</span>
                <div>
                  <strong>{STATUS_LABEL[event.toStatus]}</strong>
                  <small>{event.actorName} · {new Date(event.occurredAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{event.note ? ` · ${event.note}` : ""}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
