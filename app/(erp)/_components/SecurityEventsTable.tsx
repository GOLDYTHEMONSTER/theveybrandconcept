"use client";

import { useState } from "react";
import type { SandboxSecurityEvent } from "../../../modules/security/sandbox-events";

const TYPE_LABEL: Record<SandboxSecurityEvent["type"], string> = {
  "login.success": "Login succeeded",
  "login.failure": "Login failed",
  logout: "Logout",
};

const TYPE_TONE: Record<SandboxSecurityEvent["type"], string> = {
  "login.success": "positive",
  "login.failure": "negative",
  logout: "neutral",
};

export default function SecurityEventsTable({ events }: { events: SandboxSecurityEvent[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const filtered = events.filter((event) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q ||
      (event.email ?? "").toLowerCase().includes(q) ||
      (event.actorName ?? "").toLowerCase().includes(q) ||
      (event.ipAddress ?? "").toLowerCase().includes(q);
    const matchesType = type === "all" || event.type === type;
    return matchesQuery && matchesType;
  });

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input type="search" placeholder="Search by email, name or IP" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="view-toolbar-actions">
          <select className="view-filter" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All events</option>
            <option value="login.success">Login succeeded</option>
            <option value="login.failure">Login failed</option>
            <option value="logout">Logout</option>
          </select>
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Account</th>
              <th>IP address</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No activity matches your search.</td></tr>
            )}
            {filtered.map((event, index) => (
              <tr key={`${event.occurredAt}-${index}`}>
                <td>{new Date(event.occurredAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td><span className={`status-pill ${TYPE_TONE[event.type]}`}>{TYPE_LABEL[event.type]}</span></td>
                <td><strong>{event.actorName ?? "Unknown"}</strong>{event.email && <small>{event.email}</small>}</td>
                <td>{event.ipAddress ?? "—"}</td>
                <td style={{ maxWidth: 220 }}><small>{event.userAgent ?? "—"}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {events.length} recent events</span>
      </div>
    </>
  );
}
