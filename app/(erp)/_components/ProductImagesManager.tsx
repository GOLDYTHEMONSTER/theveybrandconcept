"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ProductImagesManagerProps {
  productId: string;
  imageUrl: string | null;
  images: string[];
}

export default function ProductImagesManager({ productId, imageUrl, images }: ProductImagesManagerProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save(nextImages: string[], nextMain: string | null) {
    setError("");
    const response = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: nextImages, imageUrl: nextMain }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not update images.");
      return;
    }
    router.refresh();
  }

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/products/upload-image", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not upload image.");
        return;
      }
      const nextImages = [...images, data.url as string];
      await save(nextImages, imageUrl ?? data.url);
    } finally {
      setIsUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleRemove(url: string) {
    setPendingUrl(url);
    try {
      const nextImages = images.filter((image) => image !== url);
      const nextMain = imageUrl === url ? nextImages[0] ?? null : imageUrl;
      await save(nextImages, nextMain);
    } finally {
      setPendingUrl(null);
    }
  }

  async function handleSetMain(url: string) {
    setPendingUrl(url);
    try {
      await save(images, url);
    } finally {
      setPendingUrl(null);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {images.map((image) => {
          const isMain = image === imageUrl;
          const isBusy = pendingUrl === image;
          return (
            <div key={image} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: isMain ? "2px solid var(--gold)" : "1px solid var(--line)" }}>
              <img src={image} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
              {isMain && (
                <span style={{ position: "absolute", top: 6, left: 6, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--gold)", color: "#fff", padding: "3px 7px", borderRadius: 999 }}>
                  Preview
                </span>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", gap: 4, padding: 5, background: "rgba(0,0,0,0.55)" }}>
                {!isMain && (
                  <button type="button" disabled={isBusy} onClick={() => handleSetMain(image)} style={{ flex: 1, fontSize: 9, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, padding: "3px 0", cursor: "pointer" }}>
                    Set preview
                  </button>
                )}
                <button type="button" disabled={isBusy} onClick={() => handleRemove(image)} style={{ flex: 1, fontSize: 9, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, padding: "3px 0", cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        {images.length === 0 && <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)" }}>No images yet.</p>}
      </div>

      <label className="erp-button secondary" style={{ display: "inline-flex", cursor: "pointer" }}>
        {isUploading ? "Uploading…" : "Add image"}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleUpload(e.target.files)} disabled={isUploading} style={{ display: "none" }} />
      </label>
      <p className="sandbox-note" style={{ textAlign: "left", marginTop: 10 }}>
        <span>●</span> The preview image is what shows first in the shop grid and product page.
      </p>

      {error && <p className="login-error" role="alert">{error}</p>}
    </div>
  );
}
