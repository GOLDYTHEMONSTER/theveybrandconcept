# Step 7: Verify Auth & Session Flow

This guide explains how to test authentication and permission checking once your Supabase database is set up.

---

## Prerequisites

- ✅ Database migrations applied (`npx supabase db push`)
- ✅ .env.local configured with Supabase credentials
- ✅ Dev server running (`npm run dev`)

---

## What We're Testing

The foundation includes three layers of security that must all work:

1. **Session Resolution** — Who is making this request?
   - Located in: [lib/auth/session.ts](lib/auth/session.ts)
   - Reads Supabase session cookie
   - Verifies user is member of the org
   - Returns: `{ userId, organizationId, departmentId, memberId }`

2. **Permission Checking** — Does this user have permission?
   - Located in: [lib/rbac/require-permission.ts](lib/rbac/require-permission.ts)
   - Queries database: `has_permission()` function
   - Checks: user's roles + role_permissions table
   - Also checks: organization tier (module access)
   - Returns: throw ForbiddenError if no permission

3. **Audit Logging** — What action happened?
   - Located in: [lib/audit/log.ts](lib/audit/log.ts)
   - Appends to `audit_logs` table
   - Records: who, what, when, why, how
   - Never allows UPDATE/DELETE (append-only)

---

## Testing Flow (Manual Steps)

### 1. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

You should see the homepage with setup instructions.

---

### 2. Create Test Data (via Supabase Console)

Since we don't have a UI yet, use Supabase Dashboard:

#### a) Create an organization
Go to **Supabase Dashboard → SQL Editor** and run:

```sql
INSERT INTO organizations (name)
VALUES ('Test Corp')
RETURNING id;
```

Copy the returned `id` (let's call it `ORG_ID`).

#### b) Create a user profile
```sql
-- First, you need to create an auth user via Supabase Dashboard
-- Go to Authentication → Users → Add User
-- Create with email/password, copy the user ID (let's call it USER_ID)

-- Then create a profile:
INSERT INTO profiles (id, email, full_name)
VALUES ('USER_ID', 'test@example.com', 'Test User')
RETURNING id;
```

#### c) Add user to organization
```sql
INSERT INTO organization_members (
  organization_id,
  profile_id,
  status
) VALUES (
  'ORG_ID',
  'USER_ID',
  'active'
)
RETURNING id;
```

#### d) Create a role
```sql
INSERT INTO roles (organization_id, name)
VALUES ('ORG_ID', 'Admin')
RETURNING id;
```

Copy the returned `id` (call it `ROLE_ID`).

#### e) Add permissions to role
```sql
-- First, add 'inventory.adjust' permission if not exists
INSERT INTO permissions (code, description)
VALUES ('inventory.adjust', 'Can adjust inventory')
ON CONFLICT (code) DO NOTHING;

-- Then link permission to role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'ROLE_ID', id FROM permissions WHERE code = 'inventory.adjust';
```

#### f) Assign role to user
```sql
INSERT INTO member_roles (
  organization_id,
  member_id,
  role_id
) VALUES (
  'ORG_ID',
  'MEMBER_ID',  -- from step c
  'ROLE_ID'
)
RETURNING id;
```

---

### 3. Test Auth Flow

#### a) Sign in
Visit: http://localhost:3000 (You should see the landing page)

Or use Supabase Console to create a test session, then the app can read it.

#### b) Make a Protected Request

Open your browser's developer console and run:

```javascript
// Call the protected inventory adjust endpoint
const response = await fetch('/api/inventory/adjust', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'test-123',
    organizationId: 'ORG_ID', // from step 2a
    quantityDelta: -5,
    reason: 'Test sale'
  })
});

const result = await response.json();
console.log(result);
```

#### Expected Results

**If everything works (200 OK):**
```json
{
  "success": true,
  "movementId": "uuid-of-new-movement",
  "message": "Inventory adjusted successfully"
}
```

**If user not authenticated (401):**
```json
{
  "error": "Not authenticated",
  "statusCode": 401
}
```

**If user not in org (403):**
```json
{
  "error": "No active membership in this organization",
  "statusCode": 403
}
```

**If permission missing (403):**
```json
{
  "error": "Missing permission: inventory.adjust",
  "statusCode": 403
}
```

**If rate limit exceeded (429):**
```json
{
  "error": "Too many requests, slow down.",
  "statusCode": 429,
  "retryAfter": 45
}
```

---

### 4. Check Audit Log

If the request succeeded, verify it was logged:

```sql
SELECT * FROM audit_logs
WHERE actor_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

You should see a row like:
```
action: 'adjust_inventory'
resource_type: 'inventory'
changes: {"quantity_delta": -5, "reason": "Test sale"}
created_at: (current timestamp)
```

---

## Understanding the Reference Route

Look at the implementation: [app/api/inventory/adjust/route.ts](app/api/inventory/adjust/route.ts)

It follows the 5-layer pattern:

```typescript
// 1. SESSION: Resolve who is making this request
const session = await getSessionContext(body.organizationId);

// 2. RATE LIMIT: Check if they're within quota
await requireRateLimit(RATE_LIMIT_RULES.apiWrite, 
  `${session.userId}:${session.organizationId}`);

// 3. PERMISSION: Check if they have permission
await requirePermission(session, 'inventory.adjust');

// 4. MUTATION: The actual write
const { data: movement, error: insertError } = await supabase
  .from('inventory_movements')
  .insert({...})
  .select()
  .single();

// 5. AUDIT LOG: Record what happened
await writeAuditLog(session, {
  action: 'adjust_inventory',
  resourceType: 'inventory',
  resourceId: movement.id,
  changes: { quantityDelta, reason }
});
```

**Key principle:** Every layer can independently reject the request.

---

## Troubleshooting

### "Not authenticated" (401)
- You're not signed in to Supabase
- Or session cookie is invalid/expired
- Fix: Sign in via auth provider (UI not built yet)

### "No active membership" (403)
- User exists but isn't a member of this org
- Or membership status is not 'active'
- Fix: Verify `organization_members` has this user with `status='active'`

### "Missing permission" (403)
- User is in the org but doesn't have the role
- Or the role doesn't have the permission
- Fix: Verify chain: member_roles → roles → role_permissions → permissions

### "Too many requests" (429)
- You've exceeded rate limit
- Default: 100 writes per minute per user+org
- Fix: Wait or change `RATE_LIMIT_RULES` in `lib/rate-limit/limiter.ts`

### No audit log created
- Either the request failed before reaching the audit step
- Or audit log insert failed
- Check server logs: `npm run dev` output
- Verify `audit_logs` table exists: `SELECT COUNT(*) FROM audit_logs;`

---

## Next Steps

Once auth flow is verified:

1. **Build Auth UI** — Sign up, sign in, password reset flows
2. **Create seed data** — Organizations, users, roles for testing
3. **Add more API routes** — Follow the inventory/adjust pattern
4. **Build business modules** — Products, Customers, Orders (Phase 2)

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for the full roadmap.

---

## Key Files for Reference

| File | Purpose |
|------|---------|
| [lib/auth/session.ts](lib/auth/session.ts) | Resolve session from cookie |
| [lib/rbac/require-permission.ts](lib/rbac/require-permission.ts) | Permission enforcement |
| [lib/audit/log.ts](lib/audit/log.ts) | Audit logging |
| [lib/rate-limit/limiter.ts](lib/rate-limit/limiter.ts) | Rate limiting logic |
| [app/api/inventory/adjust/route.ts](app/api/inventory/adjust/route.ts) | Reference route pattern |
| [middleware.ts](middleware.ts) | Edge-level security & rate limiting |
| [supabase/migrations/0001_foundation.sql](supabase/migrations/0001_foundation.sql) | Schema + RLS policies |

---

## Questions?

- Supabase Auth docs: https://supabase.com/docs/guides/auth
- RLS policies: https://supabase.com/docs/guides/database/postgres/row-level-security
- Nextjs API routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
