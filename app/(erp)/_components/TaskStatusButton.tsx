"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_OPTIONS: Array<{ value: "todo" | "in_progress" | "done" | "cancelled"; label: string }> = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

export default function TaskStatusButton({ taskId, currentStatus }: { taskId: string; currentStatus: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(status: string) {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update task.");
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
      <select
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isSaving}
        style={{ font: "500 11px 'Inter', sans-serif", padding: "5px 8px", borderRadius: 8, border: "1px solid #e2ddd0" }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <small style={{ color: "#8b2d24", display: "block", marginTop: 4 }}>{error}</small>}
    </div>
  );
}
