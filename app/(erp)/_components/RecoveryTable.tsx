"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "../../../modules/orders/domain";

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function timeAgo(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function RecoveryRow({ order, canRelease }: { order: Order; canRelease: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCopy() {
    const url = `${window.location.origin}/store/recover/${order.recoveryToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this recovery link:", url);
    }
  }

  async function handleRelease() {
    if (!window.confirm(`Release the reserved stock for order #${order.orderNumber} and cancel it? The customer's recovery link will stop working.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Abandoned checkout — stock released" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not release this order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td><strong>#{order.orderNumber}</strong><small>{order.items.length} item{order.items.length === 1 ? "" : "s"}</small></td>
      <td>{order.customer}{order.customerEmail ? <small style={{ display: "block" }}>{order.customerEmail}</small> : null}</td>
      <td className="numeric">{currency.format(order.total)}</td>
      <td>{timeAgo(order.createdAt)}</td>
      <td>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10 }} onClick={handleCopy}>
            {copied ? "Copied!" : "Copy recovery link"}
          </button>
          {canRelease && (
            <button className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10, color: "#8b2d24" }} disabled={busy} onClick={handleRelease}>
              Release stock
            </button>
          )}
        </div>
        {error && <small style={{ color: "#8b2d24", display: "block", textAlign: "right" }}>{error}</small>}
      </td>
    </tr>
  );
}

export default function RecoveryTable({ rows, canRelease }: { rows: Order[]; canRelease: boolean }) {
  return (
    <div className="erp-table-wrap">
      <table className="erp-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th className="numeric">Value</th>
            <th>Abandoned</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No abandoned checkouts right now.</td></tr>
          )}
          {rows.map((order) => (
            <RecoveryRow key={order.id} order={order} canRelease={canRelease} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
