"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface CustomerNotesFormProps {
  customerId: string;
  note: string | null;
  /** null = use the computed segment; true/false = a manual override is already set */
  vipOverride: boolean | null;
}

export default function CustomerNotesForm({ customerId, note, vipOverride }: CustomerNotesFormProps) {
  const router = useRouter();
  const [text, setText] = useState(note ?? "");
  const [override, setOverride] = useState<"auto" | "vip" | "not-vip">(
    vipOverride === true ? "vip" : vipOverride === false ? "not-vip" : "auto"
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: text.trim() || null,
          vipOverride: override === "vip" ? true : override === "not-vip" ? false : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save changes.");
        return;
      }
      setSuccess("Saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>Segment override
        <select value={override} onChange={(e) => setOverride(e.target.value as typeof override)}>
          <option value="auto">Automatic (based on order history)</option>
          <option value="vip">Force VIP</option>
          <option value="not-vip">Force not VIP</option>
        </select>
      </label>

      <label>Internal note
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Only visible to staff — sizing notes, preferences, past issues…"
          style={{ width: "100%", marginTop: 8, padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 10, outline: "none", font: "inherit" }}
        />
      </label>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="sandbox-note" style={{ textAlign: "left" }}><span>●</span> {success}</p>}

      <button className="login-submit" type="submit" disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}<span>→</span>
      </button>
    </form>
  );
}
