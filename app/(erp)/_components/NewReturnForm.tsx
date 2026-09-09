"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RETURN_REASONS, type ReturnReason } from "../../../modules/returns/domain";

// A plain label lookup, not modules/returns/service.ts -- that file pulls
// in the whole returns/orders/inventory store chain (including Node's
// crypto for randomUUID), which has no business in a client bundle.
const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  wrong_size: "Wrong size",
  damaged: "Arrived damaged",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  other: "Other",
};

interface ReturnableItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  returnable: number;
}

export default function NewReturnForm({ orderId, items }: { orderId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason>("wrong_size");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(variantId: string, max: number) {
    setSelected((current) => {
      const next = { ...current };
      if (variantId in next) delete next[variantId];
      else next[variantId] = max;
      return next;
    });
  }

  function setQuantity(variantId: string, value: number) {
    setSelected((current) => ({ ...current, [variantId]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const chosen = Object.entries(selected);
    if (chosen.length === 0) {
      setError("Select at least one item to return.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: chosen.map(([variantId, quantity]) => ({ variantId, quantity })),
          reason,
          reasonNote: note.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not start this return.");
        return;
      }
      router.push(`/returns/${data.return.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const isChecked = item.variantId in selected;
          return (
            <label
              key={item.variantId}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #ebe6dc", cursor: "pointer" }}
            >
              <input type="checkbox" checked={isChecked} onChange={() => toggle(item.variantId, item.returnable)} style={{ width: "auto" }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13 }}>{item.productName}</strong>
                <small style={{ display: "block", color: "var(--muted)" }}>{item.variantLabel} · {item.sku} · {item.returnable} returnable</small>
              </div>
              {isChecked && (
                <input
                  type="number"
                  min={1}
                  max={item.returnable}
                  value={selected[item.variantId]}
                  onChange={(e) => setQuantity(item.variantId, Math.min(item.returnable, Math.max(1, Number(e.target.value))))}
                  style={{ width: 64 }}
                />
              )}
            </label>
          );
        })}
      </div>

      <label>Reason *
        <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} required>
          {RETURN_REASONS.map((r) => <option key={r} value={r}>{RETURN_REASON_LABEL[r]}</option>)}
        </select>
      </label>

      <label>Note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Any details worth recording"
          style={{ width: "100%", marginTop: 8, padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 10, outline: "none", font: "inherit" }}
        />
      </label>

      {error && <p className="login-error" role="alert">{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting ? "Starting…" : "Start return"}<span>→</span>
        </button>
        <button type="button" className="erp-button secondary" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
