# ERP + E-commerce — Phase 1 Foundation Scaffold

This is a working starting point for the Phase 1 target from the build plan:

**Auth → Organizations → Roles → Permissions → RLS → Audit logging** — plus
rate limiting wired in from day one, since all three (security, rate
limiting, data protection) were the stated priorities, not a later pass.

## What's here

```
supabase/migrations/0001_foundation.sql   -- schema + RLS policies + RBAC helper functions
lib/supabase/server.ts                    -- server client (anon key) + service-role client
lib/supabase/client.ts                    -- browser client (anon key only, ever)
lib/auth/session.ts                       -- resolves user + org membership from the session cookie
lib/rbac/require-permission.ts            -- re-verifies permission against the DB, not the client
lib/audit/log.ts                          -- append-only audit log writer
lib/rate-limit/limiter.ts                 -- Upstash-backed limiter with Postgres fallback
middleware.ts                             -- security headers + edge rate limiting on auth routes
app/api/inventory/adjust/route.ts         -- reference implementation tying all of the above together
```

## How the priorities map to the code

**Security**
- `requirePermission()` never trusts a role/permission claim from the
  client or JWT — it calls `has_permission()` in Postgres on every
  request. This is deliberately redundant with RLS: RLS is the backstop
  that makes bad access *impossible*, the app-layer check is what lets
  you return a clean 403 instead of a failed query.
- Account tier and permission are two independent gates
  (`has_permission()` joins `tier_modules` **and** `role_permissions` —
  both must pass).
- `audit_logs` has no UPDATE/DELETE policy — append-only, enforced by
  the database, not by convention.
- Service-role key is isolated to `createServiceRoleSupabase()`, which
  throws if it's ever imported into browser code.

**Rate limiting — on all request types**
- `lib/rate-limit/limiter.ts` defines named rules per surface: auth
  login/signup/reset, generic API read/write, exports, storefront
  checkout, storefront search.
- `middleware.ts` enforces the auth-route rules at the edge, by IP,
  before Supabase Auth is even reached.
- `app/api/inventory/adjust/route.ts` shows the ERP-side pattern:
  tenant-aware bucket (`userId:organizationId`) so one organization
  can't exhaust another's quota.
- No Redis infrastructure required for v1 — Upstash's REST API is used
  if configured; otherwise it falls back to the `rate_limit_events`
  Postgres table automatically, so rate limiting is never silently
  absent.

**Data protection**
- Every business table carries `organization_id`; RLS policies call
  `is_org_member()` / `has_permission()` so cross-org access fails at
  the database, even from a hand-crafted request.
- Inventory changes are event-sourced (`inventory_movements`), not a
  bare `stock = stock - N` update — full history, no silent overwrites.
- The same event-sourced pattern is the model to follow for `finance`
  transactions (immutable + correction/reversal entries) when that
  module is built.

## Setup

```bash
cp .env.example .env.local   # fill in Supabase project + (optional) Upstash creds
npm install
supabase db push             # applies supabase/migrations/0001_foundation.sql
npm run dev
```

## Extending this foundation

- **New permission:** add a row to the `permissions` seed insert in the
  migration, assign it to `tier_modules` if it belongs to a gated
  module, then grant it to roles via `role_permissions`.
- **New protected table:** add `organization_id uuid references
  organizations(id)`, enable RLS, and add `select`/`all` policies using
  `is_org_member()` and `has_permission()` — do this in the same
  migration you create the table, not "later."
- **New protected route:** copy the five-step pattern in
  `app/api/inventory/adjust/route.ts` — session → rate limit →
  permission → mutation → audit log.
- **Finance module:** mirror `inventory_movements` — an
  append-only `financial_transactions` table plus a `reversals` table
  referencing the original transaction, never an UPDATE on the amount.
- **HR module:** add `hr.payroll.view` / `hr.profile.view` as separate
  permissions (already seeded) so payroll can be withheld from HR Staff
  while profile access remains available — enforce via RLS on the
  `employees`/`payroll` tables the same way, not just in the UI.

## Explicitly out of scope for this scaffold

MFA, full session-revocation UI, notification engine, and analytics —
these are Phase 2+ per the build plan and layer on top of this
foundation without changing it.
