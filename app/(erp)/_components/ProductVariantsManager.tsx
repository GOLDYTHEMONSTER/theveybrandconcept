"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductVariant } from "../../../modules/catalog/domain";
import type { StockSummary } from "../../../modules/inventory/store";

interface VariantRow {
  variant: ProductVariant;
  stock: StockSummary[];
}

function VariantEditRow({ productId, row }: { productId: string; row: VariantRow }) {
  const router = useRouter();
  const { variant, stock } = row;
  const [size, setSize] = useState(variant.size ?? "");
  const [color, setColor] = useState(variant.color ?? "");
  const [price, setPrice] = useState(String(variant.price));
  const [compareAtPrice, setCompareAtPrice] = useState(variant.compareAtPrice ? String(variant.compareAtPrice) : "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalAvailable = stock.reduce((sum, row) => sum + row.available, 0);

  async function handleSave() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: size.trim() || null,
          color: color.trim() || null,
          price: Number(price),
          compareAtPrice: compareAtPrice.trim() ? Number(compareAtPrice) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save.");
        return;
      }
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variant.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not remove this size.");
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <tr>
      <td><input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" style={{ width: 70 }} /></td>
      <td><input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" style={{ width: 100 }} /></td>
      <td>{variant.sku}</td>
      <td className="numeric"><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} step="0.01" style={{ width: 100, textAlign: "right" }} /></td>
      <td className="numeric"><input value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} type="number" min={1} step="0.01" placeholder="—" style={{ width: 100, textAlign: "right" }} /></td>
      <td className="numeric">{totalAvailable}</td>
      <td>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Link className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10 }} href={`/inventory/${variant.id}/adjust`}>Stock</Link>
          <button type="button" className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10 }} disabled={isSaving} onClick={handleSave}>{isSaving ? "…" : "Save"}</button>
          <button type="button" className="erp-button secondary" style={{ height: 30, padding: "0 10px", fontSize: 10, color: "#8b2d24" }} disabled={isDeleting} onClick={handleDelete}>Remove</button>
        </div>
        {error && <small style={{ color: "#8b2d24", display: "block", textAlign: "right" }}>{error}</small>}
      </td>
    </tr>
  );
}

function AddVariantRow({ productId }: { productId: string }) {
  const router = useRouter();
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, size: size.trim() || null, color: color.trim() || null, price: Number(price), compareAtPrice: null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not add this size.");
        return;
      }
      setSize("");
      setColor("");
      setSku("");
      setPrice("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr>
      <td><input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M" style={{ width: 70 }} /></td>
      <td><input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Optional" style={{ width: 100 }} /></td>
      <td><input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="New SKU" style={{ width: 130 }} /></td>
      <td className="numeric"><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} step="0.01" placeholder="Price" style={{ width: 100, textAlign: "right" }} /></td>
      <td colSpan={2}></td>
      <td>
        <button type="button" className="erp-button primary" style={{ height: 30, padding: "0 12px", fontSize: 10 }} disabled={isSaving || !sku || !price} onClick={handleSubmit}>
          {isSaving ? "Adding…" : "Add size"}
        </button>
        {error && <small style={{ color: "#8b2d24", display: "block", textAlign: "right" }}>{error}</small>}
      </td>
    </tr>
  );
}

export default function ProductVariantsManager({ productId, variantsWithStock }: { productId: string; variantsWithStock: VariantRow[] }) {
  return (
    <div className="erp-table-wrap">
      <table className="erp-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Color</th>
            <th>SKU</th>
            <th className="numeric">Price (₦)</th>
            <th className="numeric">Compare-at</th>
            <th className="numeric">Available</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {variantsWithStock.map((row) => (
            <VariantEditRow key={row.variant.id} productId={productId} row={row} />
          ))}
          <AddVariantRow productId={productId} />
        </tbody>
      </table>
    </div>
  );
}
