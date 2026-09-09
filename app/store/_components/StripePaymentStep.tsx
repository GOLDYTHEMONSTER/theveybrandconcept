"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { formatPrice } from "../_lib/format";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface StripePaymentStepProps {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
}

function PayButton({ total, onSuccess }: { total: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setError("");
    setIsPaying(true);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (confirmError) {
        setError(confirmError.message ?? "Payment could not be completed.");
        return;
      }
      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onSuccess();
        return;
      }
      setError("Payment was not completed. Please try again.");
    } catch {
      setError("Could not reach Stripe. Please try again.");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <>
      <PaymentElement />
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || isPaying}
        className="mt-5 flex w-full items-center justify-center rounded-full bg-white py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
      >
        {isPaying ? "Processing…" : `Pay ${formatPrice(total)}`}
      </button>
      <p className="mt-3 text-center text-[10px] text-muted">
        Stripe test mode — use card 4242 4242 4242 4242, any future date, any CVC.
      </p>
    </>
  );
}

export default function StripePaymentStep({ clientSecret, total, onSuccess }: StripePaymentStepProps) {
  if (!stripePromise) {
    return <p className="text-sm text-red-400">Payment processing is not configured.</p>;
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
      <PayButton total={total} onSuccess={onSuccess} />
    </Elements>
  );
}
