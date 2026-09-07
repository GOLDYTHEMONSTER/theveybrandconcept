"use client";

import { useState } from "react";
import AIViewer from "./AIViewer";

export default function VerifyIt({ images, videoUrl, name }: { images: string[]; videoUrl: string | null; name: string }) {
  const [mode, setMode] = useState<"ai" | "video">("ai");
  const [fading, setFading] = useState(false);

  function switchTo(next: "ai" | "video") {
    setFading(true);
    setTimeout(() => {
      setMode(next);
      setFading(false);
    }, 220);
  }

  return (
    <div>
      <div className={`transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}>
        {mode === "ai" ? (
          <AIViewer images={images} name={name} />
        ) : (
          <div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-4xl bg-black md:aspect-[3/4]">
              <span className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[10px] uppercase tracking-wide backdrop-blur-md">
                ✓ Verified real product
              </span>
              {videoUrl && (
                <video src={videoUrl} controls autoPlay muted loop playsInline className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">Real product, filmed in motion.</p>
            <button onClick={() => switchTo("ai")} className="mx-auto mt-2 block text-[11px] text-muted underline underline-offset-4 hover:text-ink">
              ← Back
            </button>
          </div>
        )}
      </div>

      {videoUrl && mode === "ai" && (
        <button
          onClick={() => switchTo("video")}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.01]"
        >
          Verify it <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
