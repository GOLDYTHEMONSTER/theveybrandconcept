"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const PRIORITY_OPTIONS: Array<{ value: "low" | "medium" | "high"; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function NewTaskForm({ assignees }: { assignees: Array<{ id: string; name: string; roleLabel: string }> }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(assignees[0]?.id ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !assigneeId) {
      setError("Title and assignee are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assigneeId,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not create task.");
        return;
      }
      router.push("/tasks");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>Title *
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={140} placeholder="e.g. Reconcile weekly stock count" />
      </label>
      <label>Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Any detail the assignee needs" />
      </label>
      <label>Assign to *
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>{assignee.name} — {assignee.roleLabel}</option>
          ))}
        </select>
      </label>
      <label>Priority *
        <select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>Due date
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <p className="sandbox-note" style={{ textAlign: "left" }}>
        <span>●</span> The assignee gets a notification right away, with a link straight back to this task.
      </p>

      {error && <p className="login-error" role="alert">{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting ? "Assigning…" : "Assign task"}<span>→</span>
        </button>
        <button type="button" className="erp-button secondary" onClick={() => router.push("/tasks")}>Cancel</button>
      </div>
    </form>
  );
}
