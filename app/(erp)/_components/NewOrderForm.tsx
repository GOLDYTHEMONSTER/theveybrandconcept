"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNELS } from "../../../modules/orders/domain";

interface VariantOption {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string;
  price: number;
  available: number;
}

interface LineItem {
  variantId: string;
  quantity: string;
}

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function NewOrderForm() {
  const router = useRouter();
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [customer, setCustomer] = useState("");
  const [channel, setChannel] = useState<string>(CHANNELS[0]);
  const [items, setItems] = useState<LineItem[]>([{ variantId: "", quantity: "1" }]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/catalog/variants")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setVariants(data.variants);
        setItems([{ variantId: data.variants[0]?.id ?? "", quantity: "1" }]);
      })
      .catch(() => setLoadError("Could not load products. Refresh to try again."));
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addLine() {
    setItems((prev) => [...prev, { variantId: variants[0]?.id ?? "", quantity: "1" }]);
  }

  function removeLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    const qty = Number(item.quantity) || 0;
    return sum + (variant ? variant.price * qty : 0);
  }, 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!customer.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (items.length === 0 || items.some((item) => !item.variantId || Number(item.quantity) < 1)) {
      setError("Every line needs a product and a quantity of at least 1.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: customer.trim(),
          channel,
          items: items.map((item) => ({ variantId: item.variantId, quantity: Number(item.quantity) })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not create order.");
        return;
      }
      router.replace(`/orders/${data.order.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Orders · New order</p>
          <h1>Create an order.</h1>
          <p>Stock is reserved the moment an order is created — the available count on Inventory drops immediately, before anything ships.</p>
        </div>
      </section>

      <div className="overview-panel" style={{ maxWidth: 720 }}>
        {loadError && <p className="login-error" role="alert">{loadError}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <label>Customer name *
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Chioma Eze" />
            </label>
            <label>Channel *
              <select value={channel} onChange={(e) => setChannel(e.target.value)} required>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#514b43", margin: "4px 0 10px" }}>Order items *</p>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, index) => {
                const variant = variants.find((v) => v.id === item.variantId);
                return (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.8fr auto", gap: 10, alignItems: "center" }}>
                    <select value={item.variantId} onChange={(e) => updateItem(index, { variantId: e.target.value })} required>
                      <option value="" disabled>Select a product</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.available <= 0 && v.id !== item.variantId}>
                          {v.productName} · {v.variantLabel} ({v.available} available)
                        </option>
                      ))}
                    </select>
                    <input type="number" min={1} step={1} value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} required />
                    <button type="button" className="erp-button secondary" onClick={() => removeLine(index)} disabled={items.length === 1} style={{ height: 43 }}>Remove</button>
                    {variant && <small style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>{currency.format(variant.price)} each · SKU {variant.sku}</small>}
                  </div>
                );
              })}
            </div>
            <button type="button" className="erp-button secondary" onClick={addLine} style={{ marginTop: 12 }}>Add another item</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Order total</span>
            <strong style={{ font: "500 22px 'Playfair Display', serif" }}>{currency.format(total)}</strong>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? "Creating…" : "Create order"}<span>→</span>
            </button>
            <button type="button" className="erp-button secondary" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
