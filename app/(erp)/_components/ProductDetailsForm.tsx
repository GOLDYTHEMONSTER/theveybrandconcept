"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "../../../modules/catalog/domain";
import type { Product } from "../../../modules/catalog/domain";

export default function ProductDetailsForm({ product }: { product: Product }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [status, setStatus] = useState(product.status);
  const [description, setDescription] = useState(product.description ?? "");
  const [featured, setFeatured] = useState(product.featured);
  const [videoUrl, setVideoUrl] = useState(product.videoUrl ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          status,
          description: description.trim() || null,
          featured,
          videoUrl: videoUrl.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save changes.");
        return;
      }
      setSuccess("Saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>Product name *
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label>Category *
          <select value={category} onChange={(e) => setCategory(e.target.value as Product["category"])} required>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Product["status"])}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>

      <label>Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          style={{ width: "100%", marginTop: 8, padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 10, outline: "none", font: "inherit" }}
        />
      </label>

      <label>Video URL (for the storefront&apos;s &quot;Verify it&quot; player)
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} type="url" placeholder="https://…" />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ width: "auto" }} />
        Featured on the storefront homepage
      </label>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="sandbox-note" style={{ textAlign: "left" }}><span>●</span> {success}</p>}

      <button className="login-submit" type="submit" disabled={isSaving}>
        {isSaving ? "Saving…" : "Save details"}<span>→</span>
      </button>
    </form>
  );
}
