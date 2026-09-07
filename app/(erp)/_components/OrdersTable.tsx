"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "../../../modules/orders/domain";

interface OrdersTableProps {
  rows: Order[];
  statusLabel: Record<Order["status"], string>;
  statusTone: Record<Order["status"], string>;
}

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function OrdersTable({ rows, statusLabel, statusTone }: OrdersTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || row.orderNumber.toLowerCase().includes(q) || row.customer.toLowerCase().includes(q);
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input type="search" placeholder="Search by order number or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="view-toolbar-actions">
          <select className="view-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Status</th>
              <th className="numeric">Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No orders match your filters.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/orders/${row.id}`}><strong>#{row.orderNumber}</strong></Link></td>
                <td>{row.customer}</td>
                <td>{row.channel}</td>
                <td><span className={`status-pill ${statusTone[row.status]}`}>{statusLabel[row.status]}</span></td>
                <td className="numeric">{currency.format(row.total)}</td>
                <td>{new Date(row.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {rows.length} orders</span>
      </div>
    </>
  );
}
