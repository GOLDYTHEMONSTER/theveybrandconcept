"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SandboxRole } from "../../../modules/authentication/domain";
import { ROLE_DEFINITIONS } from "../../../modules/authentication/roles";

const ROLE_OPTIONS = Object.entries(ROLE_DEFINITIONS) as Array<[SandboxRole, { label: string }]>;

interface TeamRoleSelectProps {
  memberId: string;
  currentRole: SandboxRole;
  disabled?: boolean;
}

export default function TeamRoleSelect({ memberId, currentRole, disabled }: TeamRoleSelectProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(role: SandboxRole) {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/team/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not change role.");
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
        value={currentRole}
        disabled={disabled || isSaving}
        onChange={(event) => handleChange(event.target.value as SandboxRole)}
        style={{ height: 32, borderRadius: 6, border: "1px solid var(--line)", padding: "0 8px", fontSize: 12, background: "var(--white)" }}
      >
        {ROLE_OPTIONS.map(([role, definition]) => (
          <option key={role} value={role}>{definition.label}</option>
        ))}
      </select>
      {disabled && <small>You</small>}
      {error && <small style={{ color: "#8b2d24" }}>{error}</small>}
    </div>
  );
}
