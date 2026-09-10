"use client";

import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[store error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 pb-16 pt-8 text-center md:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Something went wrong</p>
      <h1 className="mt-3 font-serif text-3xl italic md:text-4xl">That didn&apos;t load right.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">Give it another try, or head back to browsing.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => reset()} className="rounded-full bg-ink px-6 py-3 text-sm text-white transition-opacity hover:opacity-90">
          Try again
        </button>
        <a href="/store" className="rounded-full border border-hairline px-6 py-3 text-sm transition-colors hover:bg-surface">
          Back home
        </a>
      </div>
    </div>
  );
}
