"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "../_lib/useCart";
import { cartTotal, clearCart, removeFromCart, updateQuantity } from "../_lib/cart";
import { formatPrice } from "../_lib/format";

export default function CartPage() {
  const lines = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState<{ orderNumber: string } | null>(null);

  const total = cartTotal(lines);

  async function handleCheckout(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!lines.length) return setError("Your cart is empty.");
    if (!name.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email is required.");

    setPlacing(true);
    try {
      const response = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: name.trim(), email: email.trim(), address: address.trim(), city: city.trim() },
          items: lines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not place your order.");
        return;
      }
      clearCart();
      setConfirmation({ orderNumber: data.orderNumber });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (confirmation) {
    return (
      <div className="px-5 py-20 text-center md:px-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Order placed</p>
        <h1 className="mt-3 font-serif text-3xl italic">Thank you.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Order #{confirmation.orderNumber} is confirmed. We&apos;ll email you as it moves through fulfilment.
        </p>
        <Link href="/store/shop" className="mt-8 inline-block rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pb-16 pt-8 md:px-10 md:pt-10">
      <h1 className="font-serif text-3xl italic md:text-4xl">Your cart</h1>

      {lines.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-muted">Your selected pieces will appear here.</p>
          <Link href="/store/shop" className="mt-5 inline-block rounded-full border border-hairline px-6 py-3 text-sm transition-colors hover:bg-surface">
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-5">
            {lines.map((line) => (
              <div key={line.variantId} className="flex gap-4 border-b border-hairline pb-5">
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface">
                  {line.image && <img src={line.image} alt={line.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-sm text-ink">{line.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{[line.color, line.size].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-hairline px-1.5 py-1">
                      <button onClick={() => updateQuantity(line.variantId, line.quantity - 1)} aria-label="Decrease quantity" className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink"><Minus size={12} /></button>
                      <span className="w-4 text-center text-xs">{line.quantity}</span>
                      <button onClick={() => updateQuantity(line.variantId, line.quantity + 1)} aria-label="Increase quantity" className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink"><Plus size={12} /></button>
                    </div>
                    <p className="text-sm text-ink">{formatPrice(line.price * line.quantity)}</p>
                  </div>
                </div>
                <button onClick={() => removeFromCart(line.variantId)} aria-label="Remove" className="h-6 w-6 shrink-0 text-muted hover:text-ink"><X size={14} /></button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCheckout} className="h-fit rounded-4xl border border-hairline bg-surface p-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4 text-sm">
              <span className="text-muted">Subtotal</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-xl border border-hairline bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-ink" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="rounded-xl border border-hairline bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-ink" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address (optional)" className="rounded-xl border border-hairline bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-ink" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="rounded-xl border border-hairline bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-ink" />
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <button type="submit" disabled={placing} className="mt-5 flex w-full items-center justify-center rounded-full bg-white py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-50">
              {placing ? "Placing order…" : "Checkout"}
            </button>
            <p className="mt-3 text-center text-[10px] text-muted">Preview environment — payment is not processed.</p>
          </form>
        </div>
      )}
    </div>
  );
}
