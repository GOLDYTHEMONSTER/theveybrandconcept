"use client";

import { useState } from "react";
import type { CustomerRow, CustomerSegment } from "../../../modules/crm/service";

interface CustomersTableProps {
  rows: CustomerRow[];
  segmentLabel: Record<CustomerSegment, string>;
  segmentTone: Record<CustomerSegment, string>;
}

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function CustomersTable({ rows, segmentLabel, segmentTone }: CustomersTableProps) {
  const [query, setQuery] = useState("");

  const filtered = rows.filter((row) => !query.trim() || row.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input type="search" placeholder="Search customers" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Segment</th>
              <th className="numeric">Orders</th>
              <th>Last order</th>
              <th className="numeric">Lifetime value</th>
              <th>Channel</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No customers match your search.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td><span className={`status-pill ${segmentTone[row.segment]}`}>{segmentLabel[row.segment]}</span></td>
                <td className="numeric">{row.orderCount}</td>
                <td>{new Date(row.lastOrderAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                <td className="numeric">{currency.format(row.lifetimeValue)}</td>
                <td>{row.channels.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {rows.length} customers</span>
      </div>
    </>
  );
}
