"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InventoryRow } from "../../../modules/inventory/service";

interface InventoryTableProps {
  rows: InventoryRow[];
  statusLabel: Record<InventoryRow["status"], string>;
  statusTone: Record<InventoryRow["status"], string>;
  canAdjust: boolean;
}

export default function InventoryTable({ rows, statusLabel, statusTone, canAdjust }: InventoryTableProps) {
  const [query, setQuery] = useState("");
  const [warehouse, setWarehouse] = useState("all");
  const [status, setStatus] = useState("all");

  const warehouses = useMemo(() => Array.from(new Set(rows.map((row) => row.warehouse))), [rows]);

  const filtered = rows.filter((row) => {
    const matchesQuery = !query.trim() ||
      row.product.toLowerCase().includes(query.trim().toLowerCase()) ||
      row.sku.toLowerCase().includes(query.trim().toLowerCase());
    const matchesWarehouse = warehouse === "all" || row.warehouse === warehouse;
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesWarehouse && matchesStatus;
  });

  return (
    <>
      <div className="view-toolbar">
        <div className="view-toolbar-search">
          <input
            type="search"
            placeholder="Search by product or SKU"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="view-toolbar-actions">
          <select className="view-filter" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>
            <option value="all">All warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh} value={wh}>{wh}</option>
            ))}
          </select>
          <select className="view-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th className="numeric">On hand</th>
              <th className="numeric">Reserved</th>
              <th className="numeric">Available</th>
              <th>Status</th>
              {canAdjust && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={canAdjust ? 8 : 7} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No inventory matches your filters.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={`${row.variantId}-${row.warehouse}`}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {row.imageUrl
                      ? <img src={row.imageUrl} alt="" style={{ width: 40, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 48, borderRadius: 6, background: "var(--cream)", flexShrink: 0 }} />}
                    <div><strong>{row.product}</strong><small>{row.variant}</small></div>
                  </div>
                </td>
                <td>{row.sku}</td>
                <td>{row.warehouse}</td>
                <td className="numeric">{row.onHand}</td>
                <td className="numeric">{row.reserved}</td>
                <td className="numeric">{row.available}</td>
                <td><span className={`status-pill ${statusTone[row.status]}`}>{statusLabel[row.status]}</span></td>
                {canAdjust && (
                  <td className="numeric">
                    <Link className="erp-button secondary" style={{ height: 32, padding: "0 12px", fontSize: 10 }} href={`/inventory/${row.variantId}/adjust?warehouse=${encodeURIComponent(row.warehouse)}`}>
                      Adjust
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {filtered.length} of {rows.length} lines</span>
      </div>
    </>
  );
}
