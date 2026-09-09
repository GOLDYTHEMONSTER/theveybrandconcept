"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InventoryRow } from "../../../modules/inventory/service";

interface InventoryTableProps {
  rows: InventoryRow[];
  statusLabel: Record<InventoryRow["status"], string>;
  statusTone: Record<InventoryRow["status"], string>;
  canAdjust: boolean;
  canManageFeatured: boolean;
}

const STATUS_PRIORITY: Record<InventoryRow["status"], number> = {
  out_of_stock: 0,
  low_stock: 1,
  in_stock: 2,
};

interface ProductGroup {
  productId: string;
  product: string;
  featured: boolean;
  imageUrl: string | null;
  rows: InventoryRow[];
  onHand: number;
  reserved: number;
  available: number;
  status: InventoryRow["status"];
  warehouseCount: number;
}

function groupByProduct(rows: InventoryRow[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const row of rows) {
    let group = groups.get(row.productId);
    if (!group) {
      group = {
        productId: row.productId,
        product: row.product,
        featured: row.featured,
        imageUrl: row.imageUrl,
        rows: [],
        onHand: 0,
        reserved: 0,
        available: 0,
        status: "in_stock",
        warehouseCount: 0,
      };
      groups.set(row.productId, group);
    }
    group.rows.push(row);
    group.onHand += row.onHand;
    group.reserved += row.reserved;
    group.available += row.available;
    if (STATUS_PRIORITY[row.status] < STATUS_PRIORITY[group.status]) group.status = row.status;
  }
  for (const group of groups.values()) {
    group.warehouseCount = new Set(group.rows.map((row) => row.warehouse)).size;
  }
  return Array.from(groups.values()).sort((a, b) => a.product.localeCompare(b.product));
}

export default function InventoryTable({ rows, statusLabel, statusTone, canAdjust, canManageFeatured }: InventoryTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [warehouse, setWarehouse] = useState("all");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingFeatured, setSavingFeatured] = useState<string | null>(null);

  const warehouses = useMemo(() => Array.from(new Set(rows.map((row) => row.warehouse))), [rows]);

  const filteredRows = rows.filter((row) => {
    const matchesQuery = !query.trim() ||
      row.product.toLowerCase().includes(query.trim().toLowerCase()) ||
      row.sku.toLowerCase().includes(query.trim().toLowerCase());
    const matchesWarehouse = warehouse === "all" || row.warehouse === warehouse;
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesWarehouse && matchesStatus;
  });

  const groups = useMemo(() => groupByProduct(filteredRows), [filteredRows]);

  function toggleExpanded(productId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function toggleFeatured(productId: string, next: boolean) {
    setSavingFeatured(productId);
    try {
      const response = await fetch(`/api/products/${productId}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: next }),
      });
      if (response.ok) router.refresh();
    } finally {
      setSavingFeatured(null);
    }
  }

  const columnCount = 6 + (canManageFeatured ? 1 : 0) + (canAdjust ? 1 : 0);

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
              <th className="numeric">On hand</th>
              <th className="numeric">Reserved</th>
              <th className="numeric">Available</th>
              <th>Status</th>
              <th>Locations</th>
              {canManageFeatured && <th>Featured</th>}
              {canAdjust && <th></th>}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={columnCount} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No inventory matches your filters.</td></tr>
            )}
            {groups.map((group) => {
              const isOpen = expanded.has(group.productId) || group.rows.length === 1;
              return (
                <Fragment key={group.productId}>
                  <tr style={{ cursor: group.rows.length > 1 ? "pointer" : "default" }} onClick={() => group.rows.length > 1 && toggleExpanded(group.productId)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {group.imageUrl
                          ? <img src={group.imageUrl} alt="" style={{ width: 40, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                          : <div style={{ width: 40, height: 48, borderRadius: 6, background: "var(--cream)", flexShrink: 0 }} />}
                        <div>
                          <strong>{group.product}</strong>
                          <small>{group.rows.length} {group.rows.length === 1 ? "size" : "sizes"}{group.rows.length > 1 ? ` · ${isOpen ? "hide" : "show"} breakdown` : ""}</small>
                        </div>
                      </div>
                    </td>
                    <td className="numeric">{group.onHand}</td>
                    <td className="numeric">{group.reserved}</td>
                    <td className="numeric">{group.available}</td>
                    <td><span className={`status-pill ${statusTone[group.status]}`}>{statusLabel[group.status]}</span></td>
                    <td>{group.warehouseCount}</td>
                    {canManageFeatured && (
                      <td onClick={(event) => event.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10 }} href={`/inventory/product/${group.productId}`}>
                            Edit
                          </Link>
                          <button
                            type="button"
                            className={`erp-button ${group.featured ? "primary" : "secondary"}`}
                            style={{ height: 30, padding: "0 10px", fontSize: 10 }}
                            disabled={savingFeatured === group.productId}
                            onClick={() => toggleFeatured(group.productId, !group.featured)}
                          >
                            {group.featured ? "Featured" : "Feature"}
                          </button>
                        </div>
                      </td>
                    )}
                    {canAdjust && <td></td>}
                  </tr>
                  {isOpen && group.rows.map((row) => (
                    <tr key={`${row.variantId}-${row.warehouse}`} className="inventory-variant-row">
                      <td style={{ paddingLeft: 64 }}>
                        <small>{row.variant} · {row.sku} · {row.warehouse}</small>
                      </td>
                      <td className="numeric">{row.onHand}</td>
                      <td className="numeric">{row.reserved}</td>
                      <td className="numeric">{row.available}</td>
                      <td><span className={`status-pill ${statusTone[row.status]}`}>{statusLabel[row.status]}</span></td>
                      <td></td>
                      {canManageFeatured && <td></td>}
                      {canAdjust && (
                        <td className="numeric">
                          <Link className="erp-button secondary" style={{ height: 32, padding: "0 12px", fontSize: 10 }} href={`/inventory/${row.variantId}/adjust?warehouse=${encodeURIComponent(row.warehouse)}`}>
                            Adjust
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Showing {groups.length} products · {filteredRows.length} of {rows.length} size/location lines</span>
      </div>
    </>
  );
}
