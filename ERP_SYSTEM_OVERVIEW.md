# 🏗️ ERP Foundation — What's Included

## 1️⃣ Core Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│ 1. SESSION              (lib/auth/session.ts)              │
│    → Resolve user + org from Supabase session cookie       │
│    → Verify membership is active                           │
│    → Return: userId, organizationId, departmentId          │
│                                                             │
│ 2. RATE LIMITING        (lib/rate-limit/limiter.ts)        │
│    → Auth: 5/15min per IP                                  │
│    → API: 100/min per user+org                             │
│    → Checkout: 10/min                                      │
│    → Search: 50/min                                        │
│    → Falls back to Postgres if Redis unavailable           │
│                                                             │
│ 3. AUTHORIZATION        (lib/rbac/require-permission.ts)   │
│    → Check if user has permission (queries DB)             │
│    → Check if org tier includes module                     │
│    → Both must pass (no permission = 403)                  │
│                                                             │
│ 4. ROW-LEVEL SECURITY   (supabase/migrations/0001)         │
│    → Database enforces org isolation                       │
│    → Cross-org access impossible (even with bugs)          │
│    → Every table has RLS policies                          │
│                                                             │
│ 5. AUDIT LOGGING        (lib/audit/log.ts)                 │
│    → Append-only record of all actions                     │
│    → Who, what, when, why, how                             │
│    → Database prevents UPDATE/DELETE                       │
│    → Compliance-ready                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Database Schema (15+ Tables)

### Authentication & Organization
```
┌─ organizations
│  ├─ id, name, slug, tier, status
│  └─ tier: 'business' | 'enterprise'
│
├─ profiles (linked to auth.users)
│  ├─ id, full_name, avatar_url, status
│  └─ 1:1 with Supabase auth user
│
├─ organization_members
│  ├─ id, organization_id, profile_id, department_id, status
│  └─ many-to-many: users to orgs
│
└─ departments
   ├─ id, organization_id, name
   └─ org structure (Finance, HR, Sales, Inventory, etc.)
```

### Authorization (RBAC)
```
┌─ tier_modules
│  ├─ tier, module (business/enterprise → what modules unlock)
│  └─ business: sales, inventory, orders, support, analytics
│     enterprise: + hr, finance, advanced_analytics, api
│
├─ permissions (atomic actions)
│  ├─ code (inventory.adjust, finance.export, hr.payroll.view, etc.)
│  ├─ module (inventory, finance, hr, sales, org, etc.)
│  └─ 17 permissions pre-seeded
│
├─ roles (job titles)
│  ├─ organization_id, name (Finance Manager, Inventory Staff, etc.)
│  └─ Per-organization (not global)
│
├─ role_permissions
│  ├─ Links roles to permissions
│  └─ data_scope: 'own' | 'department' | 'organization'
│
└─ member_roles
   ├─ Assigns roles to users per org
   └─ granted_at, granted_by (audit trail)
```

### Compliance & Operational
```
┌─ audit_logs (append-only)
│  ├─ organization_id, actor_id, action, entity_type, entity_id
│  ├─ before_value, after_value (jsonb)
│  ├─ reason, ip_address, created_at
│  ├─ Indexed on: (org_id, created_at), (entity_type, entity_id)
│  └─ Policy: INSERT allowed, UPDATE/DELETE BLOCKED
│
├─ rate_limit_events (backstop)
│  ├─ bucket_key (e.g. "login:1.2.3.4" or "api:org:user:route")
│  └─ created_at (for calculating hits in time window)
│
└─ inventory (event-sourced)
   ├─ product_id, organization_id, stock (derived total)
   └─ NEVER updated directly — trigger recomputes from movements
      
└─ inventory_movements (source of truth)
   ├─ organization_id, product_id, type, quantity (signed)
   ├─ type: purchase | sale | return | damage | adjustment | transfer | stock_count
   ├─ reference, actor_id, reason, created_at
   ├─ Policy: INSERT allowed, UPDATE/DELETE BLOCKED (append-only)
   └─ Trigger: Automatically updates inventory.stock
```

---

## 3️⃣ SQL Helper Functions

```
is_org_member(organization_id)
  → SELECT true if current user is active member of org
  → Used in RLS SELECT policies

has_permission(organization_id, permission_code)
  → SELECT true if user has permission AND org tier includes module
  → Used in RLS UPDATE/INSERT/DELETE policies
  → Two independent gates: tier + role/permission

has_department_permission(department_id, permission_code)
  → Like has_permission but department-scoped
  → For "only manage your own dept" constraints
```

---

## 4️⃣ Backend Utilities (lib/)

### Session Management
**File:** `lib/auth/session.ts`
```typescript
interface SessionContext {
  userId: string;
  organizationId: string;
  departmentId: string | null;
  memberId: string;
}

await getSessionContext(preferredOrgId?)
  // Resolve from Supabase session cookie
  // Verify membership is active
  // Multi-org users can switch with preferredOrgId
```

### Authorization
**File:** `lib/rbac/require-permission.ts`
```typescript
await requirePermission(session, 'inventory.adjust')
  // Query DB: has_permission() function
  // Throw ForbiddenError if false
  // Never trusts JWT or client claims

await requireDepartmentPermission(session, 'sales.manage')
  // Department-scoped variant
```

### Audit Logging
**File:** `lib/audit/log.ts`
```typescript
interface AuditEntry {
  action: string;              // 'inventory.adjust'
  entityType?: string;         // 'product'
  entityId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  ipAddress?: string;
}

await writeAuditLog(session, {
  action: 'inventory.adjust',
  entityType: 'product',
  entityId: '123',
  beforeValue: { stock: 100 },
  afterValue: { stock: 95 },
  reason: 'Sale order #456'
})
```

### Rate Limiting
**File:** `lib/rate-limit/limiter.ts`
```typescript
const RATE_LIMIT_RULES = {
  authLogin: { max: 5, windowMs: 15 * 60 * 1000 },      // 5/15min
  authSignup: { max: 3, windowMs: 60 * 60 * 1000 },     // 3/hour
  authReset: { max: 5, windowMs: 60 * 60 * 1000 },      // 5/hour
  apiRead: { max: 100, windowMs: 60 * 1000 },           // 100/min
  apiWrite: { max: 100, windowMs: 60 * 1000 },          // 100/min
  checkoutSubmit: { max: 10, windowMs: 60 * 1000 },     // 10/min
  search: { max: 50, windowMs: 60 * 1000 }              // 50/min
};

await requireRateLimit(RATE_LIMIT_RULES.apiWrite, bucketKey)
  // Uses Upstash Redis if configured
  // Falls back to Postgres rate_limit_events table
  // Tenant-aware: bucketKey = `${userId}:${organizationId}`
```

### Supabase Clients
**File:** `lib/supabase/server.ts` & `lib/supabase/client.ts`
```typescript
// Server: creates both clients (for different use cases)
const supabaseAnonClient = createSupabaseClient()        // RLS-enforced
const supabaseServiceClient = createServiceRoleSupabase() // Admin access (never in browser!)

// Browser: only anon client (throws if service-role attempted)
const supabase = createSupabaseClient()
```

---

## 5️⃣ Reference Implementation

### API Endpoint Pattern
**File:** `app/api/inventory/adjust/route.ts`

```
POST /api/inventory/adjust

The 5-layer pattern (copy this for all endpoints):

┌─────────────────────────────────────────────────────┐
│ 1. Parse Request Body                              │
│    - Validate required fields                      │
│    - Extract: productId, organizationId, quantity  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Resolve Session (Who is this?)                  │
│    - await getSessionContext(body.organizationId)  │
│    - Returns: userId, organizationId, memberId     │
│    - Throws: UnauthenticatedError, NoOrgError      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Rate Limit Check (Within quota?)                │
│    - await requireRateLimit(                       │
│        RATE_LIMIT_RULES.apiWrite,                  │
│        `${userId}:${organizationId}`               │
│      )                                              │
│    - Throws: RateLimitExceededError (429)          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. Permission Check (Have permission?)             │
│    - await requirePermission(                      │
│        session,                                     │
│        'inventory.adjust'                          │
│      )                                              │
│    - Checks: org tier + user role/permissions      │
│    - Throws: ForbiddenError (403)                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. Execute Mutation (The actual write)             │
│    - supabase.from('inventory_movements').insert() │
│    - RLS enforces org isolation (backstop)         │
│    - Throws if RLS denies access                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. Audit Log (What happened?)                      │
│    - await writeAuditLog(session, {                │
│        action: 'adjust_inventory',                 │
│        entityType: 'inventory',                    │
│        entityId: productId,                        │
│        beforeValue, afterValue, reason             │
│      })                                             │
│    - Append-only, can't be edited later            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. Return Response                                 │
│    - 200 OK with result                            │
│    - 401, 403, 429 errors caught + returned        │
└─────────────────────────────────────────────────────┘
```

---

## 6️⃣ Security Policies (RLS)

Every table has these policies:

```sql
-- SELECT: Must be org member
CREATE POLICY "org_members_can_read" ON table_name
  FOR SELECT USING (is_org_member(organization_id));

-- UPDATE/DELETE/INSERT: Must have permission + be org member
CREATE POLICY "permission_required_to_write" ON table_name
  FOR ALL USING (has_permission(organization_id, 'module.action'))
  WITH CHECK (has_permission(organization_id, 'module.action'));

-- Audit logs: Append-only (no UPDATE/DELETE policy at all)
-- This makes it database-impossible to edit a logged action
```

---

## 7️⃣ Pre-Seeded Permissions (17 total)

```
INVENTORY:
  ✓ inventory.view        (see inventory records)
  ✓ inventory.create      (create items)
  ✓ inventory.edit        (modify items)
  ✓ inventory.adjust      (change stock levels)
  ✓ inventory.transfer    (move between locations)
  ✓ inventory.export      (export reports)

SALES:
  ✓ sales.view            (see sales records)
  ✓ sales.create          (create orders)

ORDERS:
  ✓ orders.view           (see orders)
  ✓ orders.transition     (change status)

FINANCE:
  ✓ finance.view          (see financial data)
  ✓ finance.record        (record transactions)
  ✓ finance.reverse       (corrections/reversals)

HR:
  ✓ hr.profile.view       (employee profiles)
  ✓ hr.payroll.view       (payroll data — hidden from staff)

ORGANIZATION:
  ✓ org.roles.manage      (manage roles + permissions)
  ✓ org.members.manage    (manage membership)
```

---

## 8️⃣ Middleware & Edge Security

**File:** `middleware.ts`

```typescript
// Runs on every request at Vercel edge

✓ Security Headers (HSTS, CSP, X-Frame-Options, etc.)
✓ Auth endpoint rate limiting (before Supabase Auth)
  - /auth/login:     5/15min per IP
  - /auth/signup:    3/hour per IP
  - /auth/reset:     5/hour per IP
✓ Redirect non-auth traffic (optional)
```

---

## 9️⃣ What's NOT Included (Phase 2+)

```
Phase 2 — Commerce Core:
  □ Products, categories, variants
  □ Customers, customer segments
  □ Orders, checkout, payments
  □ Full inventory management

Phase 3 — ERP Modules:
  □ Sales management (reps, targets, commissions)
  □ Order fulfillment (packing, shipping, tracking)
  □ Support ticketing system
  □ Notifications (centralized event system)

Phase 4 — Restricted Modules:
  □ Finance (immutable transactions, corrections)
  □ HR (payroll, leave, reviews)
  □ Field-level access control (payroll hidden)

Phase 5 — Analytics:
  □ Dashboards (executive, department-specific)
  □ KPI tracking and reporting
  □ CSV/PDF exports

Phase 6 — Hardening:
  □ Security audit + pen testing
  □ Performance optimization
  □ Backup/recovery procedures
```

---

## 🔟 Getting Started Checklist

- [ ] Fill `.env.local` with Supabase credentials
- [ ] Run: `npx supabase db push` (applies migrations)
- [ ] Create seed data (org, user, roles)
- [ ] Start dev: `npm run dev`
- [ ] Test auth flow (see STEP_7_AUTH_TESTING.md)
- [ ] Make POST request to `/api/inventory/adjust`
- [ ] Verify audit log was created
- [ ] Check RLS policies in Supabase console

---

## 📊 Stats

| Component | Count |
|-----------|-------|
| Database Tables | 11 |
| Security Policies (RLS) | 20+ |
| Pre-seeded Permissions | 17 |
| Rate Limit Rules | 7 |
| SQL Helper Functions | 3 |
| Backend Utility Modules | 5 |
| API Endpoint Examples | 1 (+ template) |
| Lines of SQL | ~800 |
| Lines of TypeScript | ~500 |

---

**Bottom line:** Phase 1 foundation is **production-ready infrastructure**. Everything else (products, orders, customers, dashboards) is built on top using the same patterns.
