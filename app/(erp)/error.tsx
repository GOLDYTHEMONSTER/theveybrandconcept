"use client";

import { useEffect } from "react";

export default function ErpError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[erp error boundary]", error);
  }, [error]);

  return (
    <section className="erp-hero">
      <div>
        <p className="erp-eyebrow">Something went wrong</p>
        <h1>This page hit a snag.</h1>
        <p>Nothing was lost — try loading it again. If it keeps failing, note what you were doing and flag it to the team.</p>
      </div>
      <div className="erp-hero-actions">
        <button type="button" className="erp-button primary" onClick={() => reset()}>Try again</button>
        <a href="/dashboard" className="erp-button secondary">Back to dashboard</a>
      </div>
    </section>
  );
}
