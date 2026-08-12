# ERP + E-commerce — Quick Setup Guide

## Phase 1: Initial Setup (Right Now)

### 1. Create Supabase Project
1. Go to https://supabase.com and sign in (or create account)
2. Click **"New Project"**
3. Name it (e.g., "theveybrand-erp")
4. Create a password (you'll need this later)
5. Select region closest to your users
6. Wait for project to initialize (~2 min)

### 2. Get API Keys
Once your project is ready:
1. Go to **Settings → API**
2. Copy **Project URL** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public key** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role key** → paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **KEEP THIS SECRET** — never commit to git, never share

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Database Migrations
```bash
npx supabase db push
```
This creates all tables, RLS policies, and helper functions.

### 5. Start Development Server
```bash
npm run dev
```
Visit http://localhost:3000

---

## What's Included in Phase 1 Foundation

✅ **Auth Layer** — Supabase Auth (email/password, OAuth-ready)  
✅ **Organization Model** — multi-tenant: Organizations > Departments > Members > Roles  
✅ **RBAC (Role-Based Access Control)**  
  - Permissions (e.g., `inventory.adjust`, `finance.export`)
  - Roles link to permissions
  - Users get roles per organization/department

✅ **Row-Level Security (RLS)** — enforced at database layer  
  - Every table is org-isolated
  - Users can only access their org's data
  - Even a compromised app can't leak cross-org data

✅ **Rate Limiting**  
  - Auth endpoints: 5 attempts per 15 min (per IP)
  - API writes: 100 per min (per user + org)
  - Search: 50 per min
  - Checkout: 10 per min
  - Falls back to Postgres if Redis unavailable

✅ **Audit Logging** — append-only  
  - No UPDATE/DELETE on audit_logs (database-enforced)
  - Tracks: user login, permission changes, data mutations, admin actions

✅ **Inventory as Events**  
  - Not: "stock = 100"
  - But: [sale -5], [purchase +20], [damage -2] with timestamps
  - Full history, no silent overwrites

---

## Project Structure

```
├── app/                        # Next.js pages & API routes
│   ├── api/
│   │   ├── inventory/adjust    # Reference: protected mutation pattern
│   │   └── _example            # Template for new endpoints
│   └── (other pages)
│
├── lib/                        # Reusable backend logic
│   ├── auth/session.ts         # Resolve user + org from session
│   ├── rbac/
│   │   └── require-permission.ts  # Permission enforcement
│   ├── audit/
│   │   └── log.ts              # Append audit events
│   ├── rate-limit/
│   │   └── limiter.ts          # Upstash + Postgres fallback
│   └── supabase/
│       ├── server.ts           # Server-side clients
│       └── client.ts           # Browser client (anon key only)
│
├── supabase/
│   └── migrations/
│       ├── 0001_foundation.sql     # Schema, RLS policies, functions
│       └── 0002_inventory_preview.sql  # Sample: inventory movements
│
├── middleware.ts               # Edge: security headers, rate limiting
├── public/                     # Static assets (HTML, CSS, JS, images)
├── .env.local                  # Secrets (CREATE THIS — never commit)
└── package.json
```

---

## Next Steps (Phase 2 onward)

After Phase 1 is working:

1. **Commerce Core** — products, categories, variants, images, customers, cart
2. **Order Processing** — orders, checkout, payment integration
3. **ERP Modules** — sales, inventory details, support tickets, notifications
4. **Restricted Modules** — finance (accounting), HR (payroll, benefits)
5. **Analytics** — dashboards, KPIs, exports (read-only views of data)
6. **Hardening** — security audit, performance testing, backup/recovery

---

## Key Security Principles

**Authentication ≠ Authorization**
- Being logged in ≠ being allowed to do something
- Every action checks: org subscription + user permission

**Never trust the client**
- UI decides what to show/hide (cosmetic)
- Database decides what's actually allowed (security)

**RLS is the real security**
- Middleware and app-layer checks are conveniences (fail fast, clean errors)
- RLS is the backstop that makes bad access *impossible*

**Audit everything**
- Who did what, when, where
- No edits to audit logs, ever
- Compliance requirement (finance, HR, regulatory)

---

## Troubleshooting

**npm install fails?**
- Make sure Node.js 18+ is installed: `node --version`
- Delete `node_modules/` and `package-lock.json`, then `npm install` again

**supabase db push fails?**
- Make sure `.env.local` has correct SUPABASE_SERVICE_ROLE_KEY
- Make sure Supabase project is fully initialized
- Check Supabase dashboard for any migration errors

**Can't connect to localhost:3000?**
- Check if port 3000 is already in use: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Try a different port: `npm run dev -- -p 3001`

**Getting permission errors?**
- RLS policies are intentionally restrictive
- Check that you're a member of the org in the Supabase database
- Look at `organization_members` table and confirm your `profile_id` is there

---

## Questions?

Refer to:
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- This project's architecture: `/memories/repo/erp-architecture.md`
