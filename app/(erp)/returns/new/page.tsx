import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth/session";
import { getOrder } from "../../../../modules/orders/store";
import { listReturnsForOrder } from "../../../../modules/returns/store";
import NewReturnForm from "../../_components/NewReturnForm";

export default async function NewReturnPage({ searchParams }: { searchParams: { orderId?: string } }) {
  await requirePagePermission("orders.view");

  if (!searchParams.orderId) {
    return (
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Returns · New</p>
          <h1>Which order is this for?</h1>
          <p>A return starts from a specific order — open the order you want to return from and use "Start a return" there.</p>
        </div>
        <div className="erp-hero-actions">
          <Link href="/returns" className="erp-button secondary">Back to returns</Link>
          <Link href="/orders" className="erp-button primary">Find an order</Link>
        </div>
      </section>
    );
  }

  const order = getOrder(searchParams.orderId);
  if (!order) notFound();

  const alreadyReturned = new Map<string, number>();
  for (const existing of listReturnsForOrder(order.id)) {
    if (existing.status === "rejected") continue;
    for (const item of existing.items) {
      alreadyReturned.set(item.variantId, (alreadyReturned.get(item.variantId) ?? 0) + item.quantity);
    }
  }

  const returnableItems = order.items
    .map((item) => ({ ...item, returnable: item.quantity - (alreadyReturned.get(item.variantId) ?? 0) }))
    .filter((item) => item.returnable > 0);

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Returns · New</p>
          <h1>Start a return for #{order.orderNumber}</h1>
          <p>{order.customer} · {order.channel}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Return details</p><h2>What's being returned</h2></div></div>
          {returnableItems.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Every item on this order has already been returned.</p>
          ) : (
            <NewReturnForm orderId={order.id} items={returnableItems} />
          )}
        </article>
      </section>
    </>
  );
}
