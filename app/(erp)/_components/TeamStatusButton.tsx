"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeamMemberStatus } from "../../../modules/team/store";

interface TeamStatusButtonProps {
  memberId: string;
  currentStatus: TeamMemberStatus;
  disabled?: boolean;
}

export default function TeamStatusButton({ memberId, currentStatus, disabled }: TeamStatusButtonProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const nextStatus: TeamMemberStatus = currentStatus === "active" ? "suspended" : "active";

  async function handleClick() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/team/${memberId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  if (disabled) return <small>You</small>;

  return (
    <div>
      <button type="button" className="erp-button secondary" style={{ height: 32, fontSize: 10 }} onClick={handleClick} disabled={isSaving}>
        {isSaving ? "Saving…" : currentStatus === "active" ? "Suspend" : "Reactivate"}
      </button>
      {error && <small style={{ color: "#8b2d24" }}>{error}</small>}
    </div>
  );
}
