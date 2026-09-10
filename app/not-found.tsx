import Link from "next/link";

export default function NotFound() {
  return (
    <main className="track-canvas">
      <div className="track-card">
        <div className="track-brand">
          <img src="/brand/logo-mark-ink.png" alt="" className="login-monogram" />
          <div><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></div>
        </div>
        <div className="track-empty">
          <p className="erp-eyebrow">404</p>
          <h1 style={{ marginBottom: 10 }}>This page doesn't exist.</h1>
          <p>The link may be out of date, or the page may have moved.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
            <Link href="/dashboard" className="erp-button primary">Go to dashboard</Link>
            <Link href="/store" className="erp-button secondary">Visit the store</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
