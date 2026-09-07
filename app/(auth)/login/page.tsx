"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { initials: "VY", name: "Veronica Young", role: "Executive", email: "executive@theveybrand.com" },
  { initials: "AO", name: "Amara Okafor", role: "Sales Manager", email: "sales@theveybrand.com" },
  { initials: "DC", name: "David Chen", role: "Warehouse Manager", email: "warehouse@theveybrand.com" },
  { initials: "IB", name: "Ife Bello", role: "Customer Support", email: "support@theveybrand.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error || "Login failed");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the sandbox. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function chooseAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword("Demo123!");
    setError("");
  }

  return (
    <main className="login-canvas">
      <section className="login-editorial">
        <div className="login-brand"><span className="login-monogram">VY</span><div><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></div></div>
        <div className="editorial-copy">
          <p className="erp-eyebrow">Private business workspace</p>
          <h1>Run the brand.<br /><em>Beautifully.</em></h1>
          <p>A focused operating space for sales, inventory, customers and the team behind every collection.</p>
        </div>
        <p className="login-footnote">SANDBOX ENVIRONMENT · LOCAL DATA ONLY</p>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <p className="erp-eyebrow">Secure access</p>
          <h2>Welcome back</h2>
          <p className="login-intro">Choose a demo role to preview its workspace, or enter the sandbox credentials.</p>
          <div className="account-picker">
            {DEMO_ACCOUNTS.map((account) => (
              <button type="button" className={email === account.email ? "selected" : ""} onClick={() => chooseAccount(account.email)} key={account.email}>
                <span>{account.initials}</span><div><strong>{account.role}</strong><small>{account.name}</small></div>
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required /></label>
            <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={isLoading}>{isLoading ? "Opening workspace…" : "Enter workspace"}<span>→</span></button>
          </form>
          <p className="sandbox-note"><span>●</span> Demo password: <strong>Demo123!</strong></p>
        </div>
      </section>
    </main>
  );
}
