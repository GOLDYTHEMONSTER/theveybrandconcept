"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReturnReason, ReturnRequest, ReturnStatus } from "../../../modules/returns/domain";

interface ReturnsTableProps {
  rows: ReturnRequest[];
  statusLabel: Record<ReturnStatus, string>;
  statusTone: Record<ReturnStatus, string>;
  reasonLabel: Record<ReturnReason, string>;
  initialStatus?: string;
}

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const VALID_STATUSES = ["all", "requested", "approved", "received", "refunded", "rejected"];

export default function ReturnsTable({ rows, statusLabel, statusTone, reasonLabel, initialStatus }: ReturnsTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus && VALID_STATUSES.includes(initialStatus) ? initialStatus : "all");

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || row.returnNumber.toLowerCase().includes(q) || row.customer.toLowerCase().includes(q) || row.orderNumber.toLowerCase().includes(q);
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input type="search" placeholder="Search by return, order or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="view-toolbar-actions">
          <select className="view-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="received">Received</option>
            <option value="refunded">Refunded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Return</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Reason</th>
              <th>Status</th>
              <th className="numeric">Refund amount</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No returns match your filters.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/returns/${row.id}`}><strong>#{row.returnNumber}</strong></Link></td>
                <td><Link href={`/orders/${row.orderId}`}>#{row.orderNumber}</Link></td>
                <td>{row.customer}</td>
                <td>{reasonLabel[row.reason]}</td>
                <td><span className={`status-pill ${statusTone[row.status]}`}>{statusLabel[row.status]}</span></td>
                <td className="numeric">{currency.format(row.refundAmount)}</td>
                <td>{new Date(row.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {rows.length} returns</span>
      </div>
    </>
  );
}
