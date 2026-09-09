import Link from "next/link";
import { findOrderByRecoveryToken } from "../../../../modules/orders/store";
import ResumeCheckout from "./_components/ResumeCheckout";

export const dynamic = "force-dynamic";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-20 text-center md:px-10">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">The Vey Brand</p>
      <h1 className="mt-3 font-serif text-3xl italic">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted">{body}</p>
      <Link href="/store/shop" className="mt-8 inline-block rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black">Continue shopping</Link>
    </div>
  );
}

export default function RecoverCheckoutPage({ params }: { params: { token: string } }) {
  const order = findOrderByRecoveryToken(params.token);

  if (!order) {
    return <Message title="We couldn't find that order." body="This recovery link may have expired. Contact us if you need help with your order." />;
  }
  if (order.status === "cancelled") {
    return <Message title="This order was cancelled." body="If you'd still like these pieces, feel free to shop again — we'll hold new stock for you at checkout." />;
  }
  if (order.paymentStatus === "paid") {
    return <Message title="Already paid." body={`Order #${order.orderNumber} is already confirmed — no further action needed.`} />;
  }
  if (order.paymentStatus !== "processing" || !order.paymentClientSecret) {
    return <Message title="This link is no longer valid." body="Contact us if you'd like help completing this order." />;
  }

  return <ResumeCheckout clientSecret={order.paymentClientSecret} total={order.total} orderNumber={order.orderNumber} />;
}
