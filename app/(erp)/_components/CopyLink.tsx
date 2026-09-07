"use client";

import { useState } from "react";

export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="erp-button secondary" style={{ height: 32, padding: "0 12px", fontSize: 10 }} onClick={copy}>
      {copied ? "Copied ✓" : "Copy tracking link"}
    </button>
  );
}
