"use client";

import { useEffect, useState } from "react";

const PERMISSION_LABELS: Record<string, string> = {
  "audit.view": "Audit & Security",
  "products.create": "Create Product",
  "inventory.adjust": "Adjust Inventory",
  "orders.create": "Create Order",
  "orders.cancel": "Cancel Order",
  "orders.fulfil": "Fulfil Orders",
};

export default function AccessDeniedBanner() {
  const [permission, setPermission] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const denied = params.get("denied");
    if (!denied) return;

    setPermission(denied);
    params.delete("denied");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
  }, []);

  if (!permission) return null;

  const label = PERMISSION_LABELS[permission] ?? permission;

  return (
    <div className="access-denied-banner" role="alert">
      <span>Your role doesn&apos;t include access to <strong>{label}</strong>. Ask an administrator to grant it if you need it.</span>
      <button type="button" aria-label="Dismiss" onClick={() => setPermission(null)}>×</button>
    </div>
  );
}
