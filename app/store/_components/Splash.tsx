"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "tvb_store_splash_seen";

export default function Splash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SEEN_KEY)) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => setVisible(false), 500);
    }, 1400);
    window.sessionStorage.setItem(SEEN_KEY, "1");
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas transition-all duration-500 ${leaving ? "scale-105 opacity-0" : "scale-100 opacity-100"}`}
    >
      <img src="/brand/logo-mark-white.png" alt="" className="h-16 w-auto" />
      <p className="mt-4 font-serif text-3xl italic tracking-wide">THE VEY BRAND</p>
      <p className="mt-3 text-xs uppercase tracking-[0.35em] text-muted">See it differently.</p>
    </div>
  );
}
