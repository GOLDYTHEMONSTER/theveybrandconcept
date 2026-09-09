"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const VIEW_LABELS = ["Front", "Side", "Back", "Detail"];

export default function AIViewer({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function go(delta: number) {
    setIndex((current) => (current + delta + images.length) % images.length);
  }

  function handleTouchEnd(endX: number) {
    if (touchStartX === null) return;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    setTouchStartX(null);
  }

  return (
    <div>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-4xl bg-surface md:aspect-[3/4]"
        onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
      >
        {images.map((image, i) => (
          <img
            key={image}
            src={image}
            alt={`${name} — ${VIEW_LABELS[i] ?? "view"} ${i + 1}`}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}

        {images.length > 1 && (
          <>
            <button
              aria-label="Previous view"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur-md transition-colors hover:bg-black/70"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next view"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur-md transition-colors hover:bg-black/70"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-muted md:hidden">Swipe to explore</p>

      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {images.map((image, i) => (
            <button
              key={image}
              onClick={() => setIndex(i)}
              className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${i === index ? "bg-ink text-canvas" : "bg-surface text-muted hover:text-ink"}`}
            >
              {VIEW_LABELS[i] ?? `View ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
