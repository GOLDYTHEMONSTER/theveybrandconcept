"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <main className="track-canvas">
      <div className="track-card">
        <div className="track-brand">
          <img src="/brand/logo-mark-ink.png" alt="" className="login-monogram" />
          <div><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></div>
        </div>
        <div className="track-empty">
          <p className="erp-eyebrow">Something went wrong</p>
          <h1 style={{ marginBottom: 10 }}>That didn't load right.</h1>
          <p>Try again, or head back to somewhere safe. If it keeps happening, let the team know what you were doing.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
            <button type="button" className="erp-button primary" onClick={() => reset()}>Try again</button>
            <a href="/dashboard" className="erp-button secondary">Go to dashboard</a>
          </div>
        </div>
      </div>
    </main>
  );
}
