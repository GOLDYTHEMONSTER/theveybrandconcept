"use client";

import { useState } from "react";
import Link from "next/link";
import StripePaymentStep from "../../../_components/StripePaymentStep";

export default function ResumeCheckout({ clientSecret, total, orderNumber }: { clientSecret: string; total: number; orderNumber: string }) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="px-5 py-20 text-center md:px-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Order placed</p>
        <h1 className="mt-3 font-serif text-3xl italic">Thank you.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">Order #{orderNumber} is confirmed. We&apos;ll email you as it moves through fulfilment.</p>
        <Link href="/store/shop" className="mt-8 inline-block rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16 md:px-10">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Order #{orderNumber}</p>
      <h1 className="mt-3 font-serif text-3xl italic">Finish your order</h1>
      <p className="mt-3 text-sm text-muted">Pick up right where you left off — your items are still reserved.</p>
      <div className="mt-6 rounded-4xl border border-hairline bg-surface p-6">
        <StripePaymentStep clientSecret={clientSecret} total={total} onSuccess={() => setDone(true)} />
      </div>
    </div>
  );
}
