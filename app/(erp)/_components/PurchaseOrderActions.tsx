"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PurchaseOrderStatus } from "../../../modules/procurement/store";

export default function PurchaseOrderActions({ id, status }: { id: string; status: PurchaseOrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<"order" | "receive" | "cancel" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "order" | "receive" | "cancel") {
    setError("");
    setPending(action);
    try {
      const response = await fetch(`/api/procurement/${id}/${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update purchase order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(null);
    }
  }

  if (status === "received") return <small>Received</small>;
  if (status === "cancelled") return <small>Cancelled</small>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {status === "draft" && (
          <button type="button" className="erp-button secondary" style={{ height: 28, fontSize: 10, padding: "0 10px" }} onClick={() => run("order")} disabled={pending !== null}>
            {pending === "order" ? "Placing…" : "Mark ordered"}
          </button>
        )}
        {status === "ordered" && (
          <button type="button" className="erp-button primary" style={{ height: 28, fontSize: 10, padding: "0 10px" }} onClick={() => run("receive")} disabled={pending !== null}>
            {pending === "receive" ? "Receiving…" : "Receive"}
          </button>
        )}
        <button type="button" className="erp-button secondary" style={{ height: 28, fontSize: 10, padding: "0 10px" }} onClick={() => run("cancel")} disabled={pending !== null}>
          {pending === "cancel" ? "Cancelling…" : "Cancel"}
        </button>
      </div>
      {error && <small style={{ color: "#8b2d24" }}>{error}</small>}
    </div>
  );
}
