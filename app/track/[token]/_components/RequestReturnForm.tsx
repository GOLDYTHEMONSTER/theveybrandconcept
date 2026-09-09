"use client";

import { FormEvent, useState } from "react";
import type { OrderItem } from "../../../../modules/orders/domain";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "wrong_size", label: "Wrong size" },
  { value: "damaged", label: "Arrived damaged" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

export default function RequestReturnForm({ token, items }: { token: string; items: OrderItem[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnNumber, setReturnNumber] = useState<string | null>(null);

  function toggle(variantId: string, max: number) {
    setSelected((current) => {
      const next = { ...current };
      if (variantId in next) delete next[variantId];
      else next[variantId] = max;
      return next;
    });
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
      const response = await fetch("/api/returns/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          items: chosen.map(([variantId, quantity]) => ({ variantId, quantity })),
          reason,
          reasonNote: note.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not submit your return request.");
        return;
      }
      setReturnNumber(data.returnNumber);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (returnNumber) {
    return (
      <div className="track-timeline" style={{ marginTop: 28 }}>
        <p className="erp-eyebrow">Return requested</p>
        <p style={{ marginTop: 8 }}>
          Return #{returnNumber} has been submitted. We&apos;ll review it and follow up by email.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ marginTop: 28 }}>
        <button type="button" className="erp-button secondary" onClick={() => setOpen(true)}>Request a return</button>
      </div>
    );
  }

  return (
    <div className="track-timeline" style={{ marginTop: 28 }}>
      <p className="erp-eyebrow" style={{ marginBottom: 14 }}>Request a return</p>
      <form onSubmit={handleSubmit} className="login-form">
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => {
            const isChecked = item.variantId in selected;
            return (
              <label
                key={item.variantId}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #ebe6dc", cursor: "pointer" }}
              >
                <input type="checkbox" checked={isChecked} onChange={() => toggle(item.variantId, item.quantity)} style={{ width: "auto" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13 }}>{item.productName}</strong>
                  <small style={{ display: "block", color: "var(--muted)" }}>{item.variantLabel} · Qty {item.quantity}</small>
                </div>
              </label>
            );
          })}
        </div>

        <label>Reason *
          <select value={reason} onChange={(e) => setReason(e.target.value)} required>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>

        <label>Tell us more (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            style={{ width: "100%", marginTop: 8, padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 10, outline: "none", font: "inherit" }}
          />
        </label>

        {error && <p className="login-error" role="alert">{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
            {isSubmitting ? "Submitting…" : "Submit return request"}<span>→</span>
          </button>
          <button type="button" className="erp-button secondary" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
