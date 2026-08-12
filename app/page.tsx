"use client";

import { useState } from "react";

export default function Home() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "20px",
      }}
    >
      <main
        style={{
          maxWidth: "700px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "10px",
            fontWeight: "700",
          }}
        >
          ERP + E-commerce Platform
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "#cbd5e1",
            marginBottom: "30px",
            lineHeight: "1.6",
          }}
        >
          Phase 1 Foundation: Auth → Organizations → Roles → Permissions → RLS → Audit
        </p>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "30px",
            marginBottom: "30px",
            textAlign: "left",
          }}
        >
          <h2 style={{ fontSize: "1.3rem", marginBottom: "15px" }}>
            ✅ Setup Complete
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> Next.js 14 + React 18
            </li>
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> Supabase Auth & Database
            </li>
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> RBAC (Role-Based Access Control)
            </li>
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> Row-Level Security (RLS)
            </li>
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> Rate Limiting
            </li>
            <li style={{ marginBottom: "10px" }}>
              <span style={{ color: "#10b981" }}>✓</span> Audit Logging
            </li>
          </ul>
        </div>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "30px",
            marginBottom: "30px",
          }}
        >
          <h2 style={{ fontSize: "1.3rem", marginBottom: "15px" }}>
            🔧 Next Steps
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              textAlign: "left",
            }}
          >
            <li style={{ marginBottom: "12px" }}>
              <strong>Create Supabase Project</strong>
              <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>
                Go to{" "}
                <a
                  href="https://supabase.com"
                  style={{ color: "#60a5fa", textDecoration: "none" }}
                >
                  supabase.com
                </a>{" "}
                and create a new project
              </p>
            </li>
            <li style={{ marginBottom: "12px" }}>
              <strong>Update .env.local</strong>
              <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>
                Add your Supabase keys (URL, anon key, service role key)
              </p>
            </li>
            <li style={{ marginBottom: "12px" }}>
              <strong>Run migrations</strong>
              <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>
                <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: "3px" }}>
                  npx supabase db push
                </code>
              </p>
            </li>
            <li>
              <strong>Test auth flow</strong>
              <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>
                Visit /api/auth/login and verify session resolution
              </p>
            </li>
          </ol>
        </div>

        <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://github.com"
            style={{
              padding: "12px 24px",
              background: hoveredBtn === "guide" ? "#2563eb" : "#3b82f6",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredBtn("guide")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            📖 Read Setup Guide
          </a>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "12px 24px",
              background: hoveredBtn === "docs" ? "#4b5563" : "#6b7280",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredBtn("docs")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            📚 Supabase Docs
          </a>
        </div>

        <footer
          style={{
            marginTop: "50px",
            paddingTop: "20px",
            borderTop: "1px solid #334155",
            color: "#64748b",
            fontSize: "0.9rem",
          }}
        >
          <p>
            Phase 1 Foundation • Built with{" "}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              Next.js
            </a>{" "}
            +{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              Supabase
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
