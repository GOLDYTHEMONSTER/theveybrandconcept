"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CARRIERS } from "../../../modules/orders/domain";

interface OrderActionsProps {
  orderId: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "processing" | "paid" | "failed" | "refunded";
  canFulfil: boolean;
  canCancel: boolean;
  hasShipment: boolean;
}

const SIMULATED_EVENTS: Array<{ event: string; label: string }> = [
  { event: "out_for_delivery", label: "Simulate: out for delivery" },
  { event: "delayed", label: "Simulate: delayed" },
  { event: "delivered", label: "Simulate: delivered" },
];

export default function OrderActions({ orderId, status, paymentStatus, canFulfil, canCancel, hasShipment }: OrderActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showShipForm, setShowShipForm] = useState(false);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");
  const [trackingLocation, setTrackingLocation] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("");

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "That action could not be completed.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Could not reach the server. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this order? Reserved stock will be released.")) return;
    const reason = window.prompt("Reason for cancelling (optional):") ?? undefined;
    await call(`/api/orders/${orderId}/cancel`, { reason });
  }

  async function handleShip(event: FormEvent) {
    event.preventDefault();
    if (!trackingNumber.trim()) {
      setError("Tracking number is required.");
      return;
    }
    const ok = await call(`/api/orders/${orderId}/ship`, { carrier, trackingNumber: trackingNumber.trim() });
    if (ok) setShowShipForm(false);
  }

  async function handleTrackingUpdate(event: FormEvent) {
    event.preventDefault();
    if (!trackingStatus.trim() || !trackingMessage.trim()) {
      setError("Status and message are required.");
      return;
    }
    const ok = await call(`/api/orders/${orderId}/tracking`, {
      status: trackingStatus.trim(),
      location: trackingLocation.trim() || null,
      message: trackingMessage.trim(),
    });
    if (ok) {
      setShowTrackingForm(false);
      setTrackingStatus("");
      setTrackingLocation("");
      setTrackingMessage("");
    }
  }

  const canRefund = canCancel && paymentStatus === "paid";
  const fulfilmentDone = status === "delivered" || status === "cancelled";
  const nothingToShow = (!canFulfil && !canCancel) || (fulfilmentDone && !canRefund);
  if (nothingToShow) {
    return error ? <p className="login-error" role="alert">{error}</p> : null;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error && <p className="login-error" role="alert">{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {canFulfil && status === "pending" && (
          <button className="erp-button primary" disabled={busy} onClick={() => call(`/api/orders/${orderId}/process`)}>Start processing</button>
        )}
        {canFulfil && status === "processing" && !showShipForm && (
          <button className="erp-button primary" disabled={busy} onClick={() => setShowShipForm(true)}>Mark as shipped</button>
        )}
        {canFulfil && status === "shipped" && (
          <>
            <button className="erp-button primary" disabled={busy} onClick={() => call(`/api/orders/${orderId}/deliver`)}>Mark delivered</button>
            {!showTrackingForm && <button className="erp-button secondary" disabled={busy} onClick={() => setShowTrackingForm(true)}>Add tracking update</button>}
          </>
        )}
        {canCancel && (status === "pending" || status === "processing") && (
          <button className="erp-button secondary" disabled={busy} onClick={handleCancel}>Cancel order</button>
        )}
        {canRefund && (
          <button
            className="erp-button secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Request a Stripe refund for this order? This charges nothing further but returns the customer's payment.")) {
                call(`/api/orders/${orderId}/refund`);
              }
            }}
          >
            Refund via Stripe
          </button>
        )}
      </div>

      {canFulfil && status === "shipped" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SIMULATED_EVENTS.map(({ event, label }) => (
            <button
              key={event}
              className="erp-button secondary"
              style={{ fontSize: 10, height: 32, padding: "0 12px" }}
              disabled={busy}
              onClick={() => call(`/api/orders/${orderId}/simulate-tracking`, { event })}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showShipForm && (
        <form onSubmit={handleShip} className="login-form" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>Carrier *
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)} required>
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Tracking number *
              <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} required minLength={4} maxLength={60} placeholder="e.g. GIG123456" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="login-submit" type="submit" disabled={busy} style={{ flex: 1 }}>Confirm shipment<span>→</span></button>
            <button type="button" className="erp-button secondary" onClick={() => setShowShipForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {hasShipment && showTrackingForm && (
        <form onSubmit={handleTrackingUpdate} className="login-form" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>Status *
              <input value={trackingStatus} onChange={(e) => setTrackingStatus(e.target.value)} required placeholder="e.g. Out for delivery" />
            </label>
            <label>Location
              <input value={trackingLocation} onChange={(e) => setTrackingLocation(e.target.value)} placeholder="e.g. Lagos hub" />
            </label>
          </div>
          <label>Message *
            <input value={trackingMessage} onChange={(e) => setTrackingMessage(e.target.value)} required placeholder="e.g. Package is out for delivery" />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="login-submit" type="submit" disabled={busy} style={{ flex: 1 }}>Add update<span>→</span></button>
            <button type="button" className="erp-button secondary" onClick={() => setShowTrackingForm(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
