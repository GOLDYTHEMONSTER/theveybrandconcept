"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SandboxRole } from "../../../modules/authentication/domain";
import { ROLE_DEFINITIONS, type PermissionDefinition } from "../../../modules/authentication/roles";
import { hueFor, initialsFor } from "../../../modules/shared/identity";

interface MemberView {
  id: string;
  name: string;
  email: string;
  role: SandboxRole;
  roleLabel: string;
  status: "active" | "suspended";
  effective: string[];
}

interface PermissionsManagerProps {
  members: MemberView[];
  catalog: PermissionDefinition[];
}

export default function PermissionsManager({ members, catalog }: PermissionsManagerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? "");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selected = members.find((member) => member.id === selectedId) ?? members[0];
  const groups = useMemo(() => {
    const byGroup = new Map<string, PermissionDefinition[]>();
    catalog.forEach((permission) => {
      const list = byGroup.get(permission.group) ?? [];
      list.push(permission);
      byGroup.set(permission.group, list);
    });
    return Array.from(byGroup.entries());
  }, [catalog]);

  if (!selected) return <p>No team members yet.</p>;

  const basePermissions = ROLE_DEFINITIONS[selected.role].permissions;
  const effectiveSet = new Set(selected.effective);

  async function toggle(permission: string) {
    const isBase = basePermissions.includes(permission);
    const hasIt = effectiveSet.has(permission);
    const action = hasIt ? (isBase ? "revoke" : "reset") : isBase ? "reset" : "grant";

    setError("");
    setPendingKey(permission);
    try {
      const response = await fetch(`/api/team/${selected.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update that permission.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="dashboard-grid">
      <article className="erp-panel activity-panel">
        <div className="panel-heading"><div><p className="erp-eyebrow">{selected.roleLabel} default</p><h2>{selected.name}&apos;s access</h2></div></div>

        {error && <p className="login-error" role="alert">{error}</p>}

        {groups.map(([group, permissions]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <p className="erp-eyebrow" style={{ marginBottom: 8 }}>{group}</p>
            {permissions.map((permission) => {
              const isBase = basePermissions.includes(permission.key);
              const hasIt = effectiveSet.has(permission.key);
              const isCustom = hasIt !== isBase;
              return (
                <label
                  key={permission.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: "1px solid #ebe6dc",
                    fontSize: 12,
                    cursor: pendingKey ? "wait" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasIt}
                    disabled={pendingKey !== null}
                    onChange={() => toggle(permission.key)}
                  />
                  <span style={{ flex: 1 }}>{permission.label}</span>
                  {isCustom && (
                    <small style={{ color: "#a06d35", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {hasIt ? "Granted" : "Revoked"}
                    </small>
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </article>

      <article className="erp-panel focus-panel">
        <div className="panel-heading"><div><p className="erp-eyebrow">Accounts</p><h2>Select a teammate</h2></div></div>
        <div className="focus-list">
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              className="focus-row"
              style={{
                width: "100%",
                border: 0,
                background: member.id === selected.id ? "var(--paper)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span className="header-avatar" style={{ background: hueFor(member.name), width: 26, height: 26, fontSize: 9 }}>{initialsFor(member.name)}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.roleLabel}{member.status === "suspended" ? " · Suspended" : ""}</small>
              </div>
              <b>{member.effective.length}</b>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
