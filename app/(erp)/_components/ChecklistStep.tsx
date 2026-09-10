"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChecklistStepProps {
  caseId: string;
  stepId: string;
  label: string;
  category: string;
  required: boolean;
  completedAt: string | null;
  completedByName: string | null;
  disabled: boolean;
  note?: string;
}

export default function ChecklistStep({ caseId, stepId, label, category, required, completedAt, completedByName, disabled, note }: ChecklistStepProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const done = completedAt !== null;

  async function handleToggle() {
    if (done || disabled) return;
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/onboarding/${caseId}/steps/${stepId}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update this step.");
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
    <div className="activity-row" style={{ alignItems: "center", cursor: done || disabled ? "default" : "pointer" }} onClick={handleToggle}>
      <span className="activity-mark" style={{ background: done ? "#eef1e8" : undefined, color: done ? "#657652" : undefined }}>
        {done ? "✓" : category.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <strong>{label}{!required && <small style={{ marginLeft: 6, color: "var(--muted)" }}>(optional)</small>}</strong>
        <small>
          {done ? `Completed by ${completedByName}` : note ?? category}
          {error && <span style={{ color: "#8b2d24", display: "block" }}>{error}</span>}
        </small>
      </div>
      <span className="activity-tag">{category}</span>
      <time>{done ? new Date(completedAt).toLocaleDateString("en-NG", { dateStyle: "medium" }) : isSaving ? "Saving…" : ""}</time>
    </div>
  );
}
