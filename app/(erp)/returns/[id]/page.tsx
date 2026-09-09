import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionContext, requirePagePermission } from "../../../../lib/auth/session";
import { RETURN_REASON_LABEL, RETURN_STATUS_LABEL, RETURN_STATUS_TONE } from "../../../../modules/returns/service";
import { getReturn } from "../../../../modules/returns/store";
import ReturnActions from "../../_components/ReturnActions";

export const dynamic = "force-dynamic";
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function ReturnDetailPage({ params }: { params: { id: string } }) {
  await requirePagePermission("orders.view");
  const session = await getSessionContext();

  const returnRequest = getReturn(params.id);
  if (!returnRequest) notFound();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Return #{returnRequest.returnNumber}</p>
          <h1>{returnRequest.customer}</h1>
          <p>For order <Link href={`/orders/${returnRequest.orderId}`}>#{returnRequest.orderNumber}</Link> · {RETURN_REASON_LABEL[returnRequest.reason]}</p>
        </div>
        <div className="erp-hero-actions">
          <span className={`status-pill ${RETURN_STATUS_TONE[returnRequest.status]}`} style={{ alignSelf: "center" }}>{RETURN_STATUS_LABEL[returnRequest.status]}</span>
        </div>
      </section>

      <ReturnActions
        returnId={returnRequest.id}
        status={returnRequest.status}
        canDecide={session.permissions.includes("orders.cancel")}
        canReceive={session.permissions.includes("orders.fulfil")}
        canRefund={session.permissions.includes("orders.cancel")}
      />

      <section className="dashboard-grid" style={{ marginTop: 24 }}>
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Items</p><h2>Returned items</h2></div></div>
          <div className="erp-table-wrap" style={{ margin: 0 }}>
            <table className="erp-table">
              <thead>
                <tr><th>Product</th><th className="numeric">Qty</th><th className="numeric">Unit price</th><th className="numeric">Total</th></tr>
              </thead>
              <tbody>
                {returnRequest.items.map((item) => (
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
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Refund amount</span>
            <strong style={{ font: "500 20px 'Playfair Display', serif" }}>{currency.format(returnRequest.refundAmount)}</strong>
          </div>
          {returnRequest.reasonNote && (
            <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <p className="erp-eyebrow">Customer note</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>{returnRequest.reasonNote}</p>
            </div>
          )}
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">History</p><h2>Status timeline</h2></div></div>
          <div className="focus-list">
            {[...returnRequest.events].reverse().map((event) => (
              <div className="focus-row" key={event.id}>
                <span className="focus-index">●</span>
                <div>
                  <strong>{RETURN_STATUS_LABEL[event.toStatus]}</strong>
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
