import { getShipmentByToken } from "../../../modules/orders/store";
import RequestReturnForm from "./_components/RequestReturnForm";

const STATUS_LABEL: Record<string, string> = {
  pending: "Order received",
  processing: "Preparing your order",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TrackingPage({ params }: { params: { token: string } }) {
  const found = getShipmentByToken(params.token);

  if (!found) {
    return (
      <main className="track-canvas">
        <div className="track-card">
          <div className="track-brand"><img src="/brand/logo-mark-ink.png" alt="" className="login-monogram" /><div><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></div></div>
          <div className="track-empty">
            <p className="erp-eyebrow">Tracking</p>
            <h1 style={{ marginBottom: 10 }}>We couldn't find that shipment.</h1>
            <p>Double-check the tracking link, or contact support for help.</p>
          </div>
        </div>
      </main>
    );
  }

  const { order, shipment } = found;
  const maskedNumber = `#${order.orderNumber}`;
  const timeline = [...shipment.events].reverse();

  return (
    <main className="track-canvas">
      <div className="track-card">
        <div className="track-brand"><img src="/brand/logo-mark-ink.png" alt="" className="login-monogram" /><div><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></div></div>

        <p className="erp-eyebrow">Order {maskedNumber}</p>
        <h1>{STATUS_LABEL[order.status] ?? "Tracking your order"}</h1>
        <p className="track-meta">{shipment.carrier} · Tracking number {shipment.trackingNumber}</p>

        <div className="track-status-banner">
          <div>
            <strong>{STATUS_LABEL[order.status] ?? order.status}</strong>
            <small>Last updated {new Date(timeline[0]?.occurredAt ?? shipment.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</small>
          </div>
          <span className={`status-pill ${order.status === "delivered" ? "positive" : "neutral"}`}>{order.status}</span>
        </div>

        <div className="track-timeline">
          <div className="activity-list">
            {timeline.map((event) => (
              <div className="activity-row" key={event.id}>
                <span className="activity-mark">{event.status.slice(0, 1)}</span>
                <div><strong>{event.status}</strong><small>{event.message}{event.location ? ` · ${event.location}` : ""}</small></div>
                <time>{new Date(event.occurredAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</time>
              </div>
            ))}
          </div>
        </div>

        {order.status === "delivered" && order.paymentStatus === "paid" && (
          <RequestReturnForm token={params.token} items={order.items} />
        )}
      </div>
    </main>
  );
}
