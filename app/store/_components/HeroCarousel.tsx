"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontProduct } from "../../../modules/catalog/storefront-view";
import { formatPrice } from "../_lib/format";

const AUTO_ADVANCE_MS = 5500;

export default function HeroCarousel({ products }: { products: StorefrontProduct[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const goTo = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;
  const active = products[index];

  return (
    <section
      className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-4xl bg-surface md:aspect-[3/4]">
        {products.map((product, slideIndex) => (
          <img
            key={product.id}
            src={product.imageUrl ?? undefined}
            alt={product.name}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ease-out ${
              slideIndex === index ? "z-10 scale-100 opacity-100" : "z-0 scale-105 opacity-0"
            }`}
          />
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous piece"
              onClick={() => goTo(index - 1)}
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next piece"
              onClick={() => goTo(index + 1)}
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {products.map((product, dotIndex) => (
                <button
                  key={product.id}
                  type="button"
                  aria-label={`Show ${product.name}`}
                  onClick={() => goTo(dotIndex)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${dotIndex === index ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="relative">
        {products.map((product, slideIndex) => (
          <div
            key={product.id}
            className={`transition-all duration-700 ease-out ${
              slideIndex === index
                ? "relative opacity-100 translate-y-0"
                : "pointer-events-none absolute inset-0 opacity-0 translate-y-2"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">The Vey Brand</p>
            <h1 className="mt-3 font-serif text-4xl italic leading-[1.05] md:text-6xl">{product.name}</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {product.description ?? "Designed for movement — explore every angle, then verify the real garment in motion."}
            </p>
            <p className="mt-4 text-lg text-ink">{formatPrice(product.price)}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/store/product/${product.id}`} className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.01]">
                Explore
              </Link>
              {product.videoUrl && (
                <Link href={`/store/product/${product.id}#verify`} className="rounded-full border border-hairline px-6 py-3.5 text-sm text-ink transition-colors hover:bg-surface">
                  Watch real
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
