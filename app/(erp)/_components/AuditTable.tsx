"use client";

import { useState } from "react";
import type { SandboxAuditEntry } from "../../../modules/audit/sandbox-log";

function summarizeValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function AuditTable({ entries }: { entries: SandboxAuditEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = entries.filter((entry) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.actorName.toLowerCase().includes(q) ||
      (entry.entityType ?? "").toLowerCase().includes(q) ||
      (entry.reason ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input type="search" placeholder="Search by actor, action or entity" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Change</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No audit entries match your search.</td></tr>
            )}
            {filtered.map((entry, index) => (
              <tr key={`${entry.occurredAt}-${index}`}>
                <td>{new Date(entry.occurredAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td><strong>{entry.actorName}</strong><small>{entry.actorId}</small></td>
                <td><span className="status-pill neutral">{entry.action}</span></td>
                <td>{entry.entityType ?? "—"}{entry.entityId ? <small>{entry.entityId.slice(0, 8)}…</small> : null}</td>
                <td style={{ maxWidth: 260 }}>
                  {entry.beforeValue !== undefined && <small style={{ display: "block" }}>before: {summarizeValue(entry.beforeValue)}</small>}
                  <small style={{ display: "block" }}>after: {summarizeValue(entry.afterValue)}</small>
                </td>
                <td>{entry.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {entries.length} recent actions</span>
      </div>
    </>
  );
}
