"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function ClockCard({ clockInAt }: { clockInAt: string | null }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!clockInAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [clockInAt]);

  const clockedInTimeLabel = clockInAt
    ? new Date(clockInAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
    : null;
  const elapsedLabel = clockInAt ? formatElapsed(now - new Date(clockInAt).getTime()) : null;

  async function handleClick() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/attendance/${clockInAt ? "clock-out" : "clock-in"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clockInAt ? { note: note.trim() || undefined } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not record attendance.");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="clock-card">
      <div className="clock-card-status">
        <span className={`clock-dot ${clockInAt ? "on" : "off"}`} aria-hidden />
        <div>
          <strong>{clockInAt ? "You're clocked in" : "You're clocked out"}</strong>
          <small>{clockInAt ? `Since ${clockedInTimeLabel} · ${elapsedLabel} so far` : "Clock in to start tracking today's shift"}</small>
        </div>
      </div>

      <div className="clock-card-actions">
        {clockInAt && (
          <input
            className="clock-card-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note for this shift (optional)"
            maxLength={240}
          />
        )}
        <button type="button" className={`erp-button ${clockInAt ? "secondary" : "primary"}`} onClick={handleClick} disabled={isSaving}>
          {isSaving ? "Saving…" : clockInAt ? "Clock out" : "Clock in"}
        </button>
      </div>

      {error && <small className="clock-card-error">{error}</small>}
    </section>
  );
}
