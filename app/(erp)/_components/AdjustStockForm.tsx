"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { WAREHOUSES } from "../../../modules/shared/warehouses";

interface AdjustStockFormProps {
  variantId: string;
  defaultWarehouse: string;
}

export default function AdjustStockForm({ variantId, defaultWarehouse }: AdjustStockFormProps) {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState(defaultWarehouse);
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Enter a whole number greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for every stock adjustment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          warehouse,
          quantityDelta: direction === "add" ? qty : -qty,
          reason: reason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not adjust stock.");
        return;
      }
      setSuccess(`Updated — ${data.warehouse} now has ${data.onHand} on hand.`);
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>Warehouse *
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} required>
          {WAREHOUSES.map((wh) => <option key={wh} value={wh}>{wh}</option>)}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label>Direction *
          <select value={direction} onChange={(e) => setDirection(e.target.value as "add" | "remove")}>
            <option value="add">Add stock (+)</option>
            <option value="remove">Remove stock (−)</option>
          </select>
        </label>
        <label>Quantity *
          <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
      </div>

      <label>Reason *
        <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={2} maxLength={500} placeholder="e.g. Stock count correction, damaged units, restock received" />
      </label>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="sandbox-note" style={{ textAlign: "left" }}><span>●</span> {success}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting ? "Saving…" : "Save adjustment"}<span>→</span>
        </button>
        <button type="button" className="erp-button secondary" onClick={() => router.push("/inventory")}>Back to inventory</button>
      </div>
    </form>
  );
}
