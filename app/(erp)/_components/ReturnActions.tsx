"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReturnStatus } from "../../../modules/returns/domain";

interface ReturnActionsProps {
  returnId: string;
  status: ReturnStatus;
  canDecide: boolean;
  canReceive: boolean;
  canRefund: boolean;
}

export default function ReturnActions({ returnId, status, canDecide, canReceive, canRefund }: ReturnActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    const note = window.prompt("Reason for rejecting this return (optional):") ?? undefined;
    await call(`/api/returns/${returnId}/reject`, { note });
  }

  async function handleRefund() {
    if (!window.confirm("Issue a Stripe refund for this return? This cannot be undone from here.")) return;
    await call(`/api/returns/${returnId}/refund`);
  }

  const nothingToShow =
    (status === "requested" && !canDecide) ||
    (status === "approved" && !canReceive) ||
    (status === "received" && !canRefund) ||
    status === "rejected" ||
    status === "refunded";

  if (nothingToShow) {
    return error ? <p className="login-error" role="alert">{error}</p> : null;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error && <p className="login-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {status === "requested" && canDecide && (
          <>
            <button className="erp-button primary" disabled={busy} onClick={() => call(`/api/returns/${returnId}/approve`)}>Approve return</button>
            <button className="erp-button secondary" disabled={busy} onClick={handleReject}>Reject</button>
          </>
        )}
        {status === "approved" && canReceive && (
          <button className="erp-button primary" disabled={busy} onClick={() => call(`/api/returns/${returnId}/receive`)}>Mark received &amp; restock</button>
        )}
        {status === "received" && canRefund && (
          <button className="erp-button primary" disabled={busy} onClick={handleRefund}>Refund via Stripe</button>
        )}
      </div>
    </div>
  );
}
