"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "../../../modules/catalog/domain";
import { WAREHOUSES } from "../../../modules/shared/warehouses";

export default function NewProductForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: CATEGORIES[0] as string,
    description: "",
    status: "active",
    sku: "",
    color: "",
    size: "",
    price: "",
    compareAtPrice: "",
    initialStock: "0",
    warehouse: WAREHOUSES[0] as string,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageChange(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const uploadBody = new FormData();
        uploadBody.append("file", imageFile);
        const uploadResponse = await fetch("/api/products/upload-image", { method: "POST", body: uploadBody });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          setError(uploadData.error || "Could not upload image.");
          return;
        }
        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? Number(form.price) : undefined,
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
          initialStock: Number(form.initialStock || 0),
          description: form.description || null,
          color: form.color || null,
          size: form.size || null,
          imageUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not create product.");
        return;
      }
      router.replace("/inventory");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Inventory · New product</p>
          <h1>Add a product.</h1>
          <p>Every field marked required is enforced on the server too — the form is convenience, not the security boundary.</p>
        </div>
      </section>

      <div className="overview-panel" style={{ maxWidth: 680 }}>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Product name *
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Naha Veil Sequence Dress" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>Category *
              <select value={form.category} onChange={(e) => update("category", e.target.value)} required>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>

          <label>Product photo
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              {imagePreview
                ? <img src={imagePreview} alt="" style={{ width: 64, height: 76, objectFit: "cover", borderRadius: 8 }} />
                : <div style={{ width: 64, height: 76, borderRadius: 8, background: "var(--cream)" }} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageChange(e.target.files)} />
            </div>
          </label>

          <label>Description
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} maxLength={2000} style={{ width: "100%", marginTop: 8, padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 10, outline: "none", font: "inherit" }} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>SKU *
              <input value={form.sku} onChange={(e) => update("sku", e.target.value.toUpperCase())} required minLength={3} maxLength={40} placeholder="VY-XXX-S-CL" />
            </label>
            <label>Warehouse *
              <select value={form.warehouse} onChange={(e) => update("warehouse", e.target.value)} required>
                {WAREHOUSES.map((wh) => <option key={wh} value={wh}>{wh}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label>Color
              <input value={form.color} onChange={(e) => update("color", e.target.value)} maxLength={40} placeholder="e.g. Champagne" />
            </label>
            <label>Size
              <input value={form.size} onChange={(e) => update("size", e.target.value)} maxLength={20} placeholder="e.g. M" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <label>Price (₦) *
              <input value={form.price} onChange={(e) => update("price", e.target.value)} required type="number" min={1} step="0.01" placeholder="76000" />
            </label>
            <label>Compare-at price (₦)
              <input value={form.compareAtPrice} onChange={(e) => update("compareAtPrice", e.target.value)} type="number" min={1} step="0.01" placeholder="Optional" />
            </label>
            <label>Initial stock *
              <input value={form.initialStock} onChange={(e) => update("initialStock", e.target.value)} required type="number" min={0} step={1} />
            </label>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="login-submit" type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? "Creating…" : "Create product"}<span>→</span>
            </button>
            <button type="button" className="erp-button secondary" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
