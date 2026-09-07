"use client";

import { useState } from "react";
import { addToCart } from "../_lib/cart";

interface AddToCartFormProps {
  variantId: string;
  sku: string;
  name: string;
  price: number;
  image: string | null;
  colors: string[];
  sizes: string[];
  available: number;
}

export default function AddToCartForm({ variantId, sku, name, price, image, colors, sizes, available }: AddToCartFormProps) {
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [added, setAdded] = useState(false);
  const soldOut = available <= 0;

  function handleAdd() {
    addToCart({ variantId, sku, name, color, size, price, image, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div>
      {colors.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${color === c ? "border-ink bg-surface text-ink" : "border-hairline text-muted hover:text-ink"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`h-9 min-w-9 rounded-full border px-2 text-xs transition-colors ${size === s ? "border-ink bg-surface text-ink" : "border-hairline text-muted hover:text-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        className="flex w-full items-center justify-center rounded-full bg-white py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-40"
      >
        {soldOut ? "Sold out" : added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {!soldOut && available <= 5 && <p className="mt-2 text-center text-[11px] text-muted">Only {available} left</p>}
    </div>
  );
}
