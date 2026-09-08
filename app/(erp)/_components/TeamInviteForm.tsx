"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SandboxRole } from "../../../modules/authentication/domain";
import { ROLE_DEFINITIONS } from "../../../modules/authentication/roles";

const ROLE_OPTIONS = Object.entries(ROLE_DEFINITIONS) as Array<[SandboxRole, { label: string; description: string }]>;

export default function TeamInviteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SandboxRole>("customer_support");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not add teammate.");
        return;
      }
      router.push("/team");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>Full name *
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Tunde Ajayi" />
      </label>
      <label>Email address *
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="name@theveybrand.com" />
      </label>
      <label>Role *
        <select value={role} onChange={(e) => setRole(e.target.value as SandboxRole)}>
          {ROLE_OPTIONS.map(([value, definition]) => (
            <option key={value} value={value}>{definition.label}</option>
          ))}
        </select>
      </label>
      <p className="sandbox-note" style={{ textAlign: "left" }}>
        <span>●</span> They'll sign in with this email and the shared demo password, starting with their role's default permissions.
      </p>

      {error && <p className="login-error" role="alert">{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting ? "Adding…" : "Add teammate"}<span>→</span>
        </button>
        <button type="button" className="erp-button secondary" onClick={() => router.push("/team")}>Cancel</button>
      </div>
    </form>
  );
}
