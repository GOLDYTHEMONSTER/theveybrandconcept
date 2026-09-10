"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePurchaseOrderButton({
  variantId,
  warehouse,
  quantity,
}: {
  variantId: string;
  warehouse: string;
  quantity: number;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, warehouse, quantity }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not create purchase order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button type="button" className="erp-button primary" style={{ height: 32, fontSize: 10, padding: "0 12px" }} onClick={handleClick} disabled={isSaving}>
        {isSaving ? "Creating…" : `Create PO for ${quantity}`}
      </button>
      {error && <small style={{ color: "#8b2d24", display: "block", marginTop: 4 }}>{error}</small>}
    </div>
  );
}
