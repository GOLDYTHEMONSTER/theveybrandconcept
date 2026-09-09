"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClockButton({ isClockedIn }: { isClockedIn: boolean }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/attendance/${isClockedIn ? "clock-out" : "clock-in"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not record attendance.");
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
      <button
        type="button"
        className={`erp-button ${isClockedIn ? "secondary" : "primary"}`}
        onClick={handleClick}
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : isClockedIn ? "Clock out" : "Clock in"}
      </button>
      {error && <small style={{ color: "#8b2d24", display: "block", marginTop: 6 }}>{error}</small>}
    </div>
  );
}
