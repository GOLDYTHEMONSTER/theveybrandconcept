"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OffboardButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    const reason = window.prompt("Reason for offboarding? This is logged and shown on the case.");
    if (reason === null) return;
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    if (!window.confirm(`This revokes ${memberId === "me" ? "your" : "their"} system access immediately. Continue?`)) return;

    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/team/${memberId}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not start offboarding.");
        return;
      }
      router.push(`/onboarding/${data.case.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button type="button" className="erp-button secondary" style={{ height: 28, padding: "0 10px", fontSize: 10, color: "#8b2d24", borderColor: "#e6b8b0" }} onClick={handleClick} disabled={isSaving}>
        {isSaving ? "Starting…" : "Begin offboarding"}
      </button>
      {error && <small style={{ color: "#8b2d24", display: "block" }}>{error}</small>}
    </div>
  );
}
