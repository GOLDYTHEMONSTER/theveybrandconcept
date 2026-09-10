"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { WAREHOUSES, type Warehouse } from "../../../modules/shared/warehouses";

interface TransferStockFormProps {
  variantId: string;
  defaultFrom: Warehouse;
}

export default function TransferStockForm({ variantId, defaultFrom }: TransferStockFormProps) {
  const router = useRouter();
  const [fromWarehouse, setFromWarehouse] = useState<Warehouse>(defaultFrom);
  const [toWarehouse, setToWarehouse] = useState<Warehouse>(WAREHOUSES.find((wh) => wh !== defaultFrom) ?? WAREHOUSES[0]);
  const [quantity, setQuantity] = useState("1");
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
    if (fromWarehouse === toWarehouse) {
      setError("Pick two different warehouses.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, fromWarehouse, toWarehouse, quantity: qty }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not transfer stock.");
        return;
      }
      setSuccess(`Transferred — ${qty} unit(s) moved from ${fromWarehouse} to ${toWarehouse}.`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label>From *
          <select value={fromWarehouse} onChange={(e) => setFromWarehouse(e.target.value as Warehouse)} required>
            {WAREHOUSES.map((wh) => <option key={wh} value={wh}>{wh}</option>)}
          </select>
        </label>
        <label>To *
          <select value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value as Warehouse)} required>
            {WAREHOUSES.map((wh) => <option key={wh} value={wh}>{wh}</option>)}
          </select>
        </label>
      </div>

      <label>Quantity *
        <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="sandbox-note" style={{ textAlign: "left" }}><span>●</span> {success}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting ? "Transferring…" : "Transfer stock"}<span>→</span>
        </button>
        <button type="button" className="erp-button secondary" onClick={() => router.push("/inventory")}>Back to inventory</button>
      </div>
    </form>
  );
}
