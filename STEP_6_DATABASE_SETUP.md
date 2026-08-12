# Step 6: Database Setup Checklist

## Prerequisites

### 1. Have a Supabase Project Ready
- [ ] Go to https://supabase.com
- [ ] Sign in or create account
- [ ] Create a new project (name, password, region)
- [ ] Wait for initialization (~2 minutes)

### 2. Get Your API Keys
Once project is ready:
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL** (looks like: `https://xxxxxxxxxxxx.supabase.co`)
- [ ] Copy **anon public key** (long alphanumeric string)
- [ ] Copy **service_role key** (another long string) ⚠️ KEEP SECRET

### 3. Update `.env.local`
Edit `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the values with your actual keys.

---

## Running Migrations

### Command
```bash
npx supabase db push
```

### What This Does
- Reads `supabase/migrations/0001_foundation.sql`
- Creates all tables in your Supabase database:
  - `organizations` — your customer tenants
  - `profiles` — user accounts
  - `organization_members` — org memberships
  - `departments` — internal structure (Sales, Finance, HR, etc.)
  - `roles` — job responsibilities (Finance Manager, Inventory Staff, etc.)
  - `permissions` — actions (inventory.adjust, finance.export, etc.)
  - `role_permissions` — link roles to permissions
  - `member_roles` — assign roles to users
  - `audit_logs` — append-only record of all actions
  - `rate_limit_events` — track rate limits (Postgres fallback)
  - `inventory_movements` — event-sourced inventory (demo table)

- Adds **RLS policies** to every table:
  - `is_org_member()` — user is member of this org
  - `has_permission()` — user has a specific permission
  - Organization isolation at database level

- Creates SQL helper functions:
  - `has_permission(p_organization_id, p_permission_code)` → boolean
  - `has_department_permission(p_department_id, p_permission_code)` → boolean
  - `is_org_member(p_organization_id)` → boolean

### Expected Output
```
Connecting to Supabase...
Loading migrations...
  0001_foundation.sql ... ✓
  0002_inventory_preview.sql ... ✓
2 migrations applied

Schema updated:
  ✓ 15 new tables
  ✓ RLS policies enabled
  ✓ Helper functions created
```

---

## Verification

### Check in Supabase Dashboard
1. Go to **Supabase Dashboard → SQL Editor**
2. Look for tables: `organizations`, `profiles`, `roles`, etc.
3. Check **Authentication → Policies** — should see RLS rules for each table

### Or Use Query
```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## If Something Goes Wrong

### Migration fails?
- Check `.env.local` has correct `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project is fully initialized
- Check you have the latest `@supabase/supabase-js`: `npm ls @supabase/supabase-js`

### Tables already exist?
- Migrations are idempotent — run again without worry
- Or go to **Supabase Dashboard → SQL Editor → drop table** to reset

### Can't connect?
- Verify network: can you reach https://supabase.com?
- Check `.env.local` is not commited to git (should be in `.gitignore`)
- Restart: `npm run dev` after changing `.env.local`

---

## Next: Verify Auth Flow (Step 7)

Once migrations succeed, you can test:

```bash
npm run dev
# Visit http://localhost:3000
# Look at /api/inventory/adjust route (reference implementation)
# Try to understand the 5-layer pattern (session → rate limit → permission → mutation → audit)
```

---

## Key Files Reference

- **Schema:** [supabase/migrations/0001_foundation.sql](../supabase/migrations/0001_foundation.sql)
- **Demo inventory table:** [supabase/migrations/0002_inventory_preview.sql](../supabase/migrations/0002_inventory_preview.sql)
- **Reference API route:** [app/api/inventory/adjust/route.ts](../app/api/inventory/adjust/route.ts)
- **Session resolver:** [lib/auth/session.ts](../lib/auth/session.ts)
- **Permission checker:** [lib/rbac/require-permission.ts](../lib/rbac/require-permission.ts)
- **Audit logger:** [lib/audit/log.ts](../lib/audit/log.ts)
- **Rate limiter:** [lib/rate-limit/limiter.ts](../lib/rate-limit/limiter.ts)

---

## Questions?

See [SETUP_GUIDE.md](../SETUP_GUIDE.md) for complete project documentation.
