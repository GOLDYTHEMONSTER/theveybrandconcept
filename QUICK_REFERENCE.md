# ⚡ Quick Reference Card

## Essential Commands

```bash
# Start development
npm run dev                    # Visit http://localhost:3000

# Build for production
npm run build

# Push database migrations
npx supabase db push

# Run TypeScript check
npx tsc --noEmit
```

---

## Essential Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `SETUP_GUIDE.md` | Getting started | First thing |
| `STEP_6_DATABASE_SETUP.md` | How to set up database | Before `supabase db push` |
| `STEP_7_AUTH_TESTING.md` | How to test auth | After migrations |
| `INTEGRATION_SUMMARY.md` | Full roadmap | Planning Phase 2 |
| `SESSION_SUMMARY.md` | What we built today | Quick review |
| `FOUNDATION_SCHEMA.md` | Database details | Deep dive |

---

## Key Concepts

### The 5-Layer Pattern (for every protected endpoint)
```
1. SESSION         → Resolve user + org from cookie
2. RATE LIMIT      → Check quota (tenant-aware bucket)
3. PERMISSION      → Query DB: does user have permission?
4. MUTATION        → The actual write (RLS as backstop)
5. AUDIT LOG       → Record: who, what, when, why
```

### Authorization Model
```
ORG Subscription
  ├─ includes MODULES
  └─ USERS in ORG
      └─ have DEPARTMENTS
          └─ have ROLES
              └─ have PERMISSIONS
```

### Core Security Principle
```
UI: "What can the user see?"    → Show/hide buttons
DB: "What can the user do?"     → RLS policies + permissions
```

---

## File Structure

```
Key Directories:
  app/           → Next.js pages + API routes
  lib/           → Reusable logic (auth, rbac, audit, rate-limit)
  supabase/      → Database migrations + policies
  public/        → Static assets (images, HTML, CSS)

Key Files:
  middleware.ts  → Edge security + rate limiting
  .env.local     → Secrets (FILL THIS IN!)
  next.config.js → Next.js configuration
  tsconfig.json  → TypeScript configuration
```

---

## Reference Implementations

### Session Resolution
**File:** `lib/auth/session.ts`
```typescript
const session = await getSessionContext(preferredOrgId);
// Returns: { userId, organizationId, departmentId, memberId }
```

### Permission Check
**File:** `lib/rbac/require-permission.ts`
```typescript
await requirePermission(session, 'inventory.adjust');
// Throws ForbiddenError if no permission
```

### Rate Limiting
**File:** `lib/rate-limit/limiter.ts`
```typescript
await requireRateLimit(RATE_LIMIT_RULES.apiWrite, bucketKey);
// Throws RateLimitExceededError if exceeded
```

### Audit Logging
**File:** `lib/audit/log.ts`
```typescript
await writeAuditLog(session, {
  action: 'adjust_inventory',
  resourceType: 'inventory',
  resourceId: movementId,
  changes: { quantityDelta, reason }
});
```

### Full Example
**File:** `app/api/inventory/adjust/route.ts` (copy this pattern!)

---

## Environment Variables (`.env.local`)

```bash
# From Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...

# Optional: Rate limiting via Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Database Essentials

### Tables Created by Migrations
```
organizations              ← Tenants
profiles                  ← User accounts
organization_members      ← Memberships
departments              ← Org structure
roles                    ← Job titles
permissions              ← Actions
role_permissions         ← Role → Permission
member_roles             ← User → Role assignment
audit_logs               ← Immutable log (append-only)
rate_limit_events        ← Rate limiting fallback
inventory_movements      ← Demo table (event-sourced)
```

### Key SQL Functions
```
has_permission(org_id, permission_code) → boolean
has_department_permission(dept_id, permission_code) → boolean
is_org_member(org_id) → boolean
```

### Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## Debugging Checklist

### "Not authenticated" (401)
- [ ] User is logged in to Supabase?
- [ ] Session cookie is valid?
- [ ] Check: `SELECT * FROM auth.users WHERE id = '...'`

### "Missing permission" (403)
- [ ] User is in the org? `SELECT * FROM organization_members WHERE profile_id = '...'`
- [ ] User has a role? `SELECT * FROM member_roles WHERE member_id = '...'`
- [ ] Role has the permission? `SELECT * FROM role_permissions WHERE role_id = '...'`

### Database push failed
- [ ] `.env.local` has correct `SUPABASE_SERVICE_ROLE_KEY`?
- [ ] Supabase project is initialized?
- [ ] Check error message in console

### Build errors
- [ ] `npm install` latest: `rm -rf node_modules && npm install`
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] Node version ≥ 18: `node --version`

---

## Important Reminders

⚠️ **Never:**
- Export `SUPABASE_SERVICE_ROLE_KEY` to frontend
- Trust JWT for authorization (check DB always)
- Commit `.env.local` to git
- Skip RLS on new tables
- Allow direct edits to `audit_logs`

✅ **Always:**
- Check session + permission on mutations
- Add RLS when creating tables
- Log sensitive actions
- Use DB as source of truth
- Test with minimal permissions

---

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs
- **PostgreSQL RLS:** https://supabase.com/docs/guides/database/postgres/row-level-security

---

## Next Steps

```bash
# 1. Get Supabase credentials
# 2. Fill .env.local
# 3. Run migrations
npx supabase db push

# 4. Create seed data (see STEP_7_AUTH_TESTING.md)

# 5. Start dev server
npm run dev

# 6. Test auth flow
# Make a POST request to /api/inventory/adjust

# 7. Check audit logs
# SELECT * FROM audit_logs ORDER BY created_at DESC
```

---

**Phase 1: Foundation ✅ Complete**  
**Phase 2: Commerce Core 🔄 Ready to Start**  
**Phase 3+: Modules 📋 Planned**

---
