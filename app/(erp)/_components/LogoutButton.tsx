"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="erp-profile" onClick={logout} disabled={busy} aria-label="Sign out">
      <span className="erp-avatar">VY</span>
      <span className="erp-profile-copy">
        <strong>{busy ? "Signing out…" : "My account"}</strong>
        <small>Sign out</small>
      </span>
    </button>
  );
}
