# 🚀 PHASE 2: ERP INTERFACE & MIGRATION PLAN

## Overview

Phase 2 transforms the foundation into a working ERP platform. This document coordinates:
- Session management implementation
- ERP dashboard & navigation
- Core data models (Products, Orders, Inventory)
- Migration strategy (risk mitigation)
- Interface building roadmap

---

## 📋 PHASE 2 SCOPE (Next 3-4 weeks)

### Week 1: Authentication & Sessions
- Login/logout endpoints + UI
- Session context & providers
- Protected route guards
- Error handling (expired sessions, 401/403/429)
- **Deliverable:** Working login flow + dashboard skeleton

### Week 2: Core Navigation & ERP Structure
- Dashboard layout
- Navigation (permission-based visibility)
- Org switcher
- User settings page
- **Deliverable:** Full dashboard shell + navigation

### Week 3: Products & Inventory
- Products API endpoints (list, create, update)
- Inventory API endpoints (view, adjust)
- Product management UI
- Inventory tracking UI
- **Deliverable:** Functional product management

### Week 4: Orders & Checkout
- Orders API endpoints
- Order status management
- Order history UI
- Basic checkout flow
- **Deliverable:** End-to-end order flow

---

## 🔐 SECURITY REQUIREMENTS FOR PHASE 2

**Every endpoint must have:**

```typescript
// 1. Session validation
const session = await getSessionContext();

// 2. Rate limiting
await requireRateLimit(RATE_LIMIT_RULES.apiWrite, 
  `${session.userId}:${session.organizationId}`);

// 3. Permission check
await requirePermission(session, 'permission.code');

// 4. Input validation (Zod schema)
const schema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0)
});
const validated = schema.parse(req.body);

// 5. Error handling (generic errors to client)
try {
  // business logic
} catch (error) {
  console.error('Internal error', error); // server-side
  return error(500, 'Request failed'); // client-side
}

// 6. Audit logging
await writeAuditLog(session, {
  action: 'products.update',
  entityType: 'product',
  entityId: productId,
  beforeValue: oldData,
  afterValue: newData
});

// 7. Test scenarios (required before deployment)
```

---

## 📁 FILE STRUCTURE FOR PHASE 2

```
app/
├── (auth)/                          # Auth pages (public)
│   ├── login/
│   │   └── page.tsx                 # Login UI
│   ├── signup/
│   │   └── page.tsx                 # Sign-up UI
│   └── reset-password/
│       └── page.tsx                 # Password reset
│
├── (app)/                           # Protected routes (require session)
│   ├── dashboard/
│   │   └── page.tsx                 # Dashboard overview
│   ├── inventory/
│   │   ├── page.tsx                 # Inventory list
│   │   └── [id]/
│   │       └── page.tsx             # Product detail
│   ├── orders/
│   │   ├── page.tsx                 # Orders list
│   │   └── [id]/
│   │       └── page.tsx             # Order detail
│   ├── finance/
│   │   ├── page.tsx                 # Finance dashboard
│   │   └── transactions/
│   │       └── page.tsx             # Transactions list
│   ├── settings/
│   │   └── page.tsx                 # User/org settings
│   └── layout.tsx                   # App layout (nav, sidebar)
│
├── api/
│   ├── auth/
│   │   ├── login/route.ts           # POST login
│   │   ├── logout/route.ts          # POST logout
│   │   ├── me/route.ts              # GET current session
│   │   └── switch-org/route.ts      # POST switch organization
│   ├── products/
│   │   ├── route.ts                 # GET list, POST create
│   │   └── [id]/route.ts            # GET, PATCH, DELETE
│   ├── inventory/
│   │   ├── adjust/route.ts          # POST adjust stock
│   │   └── movements/route.ts       # GET movement history
│   ├── orders/
│   │   ├── route.ts                 # GET list, POST create
│   │   └── [id]/
│   │       ├── route.ts             # GET, PATCH
│   │       └── transition/route.ts  # POST change status
│   └── health/route.ts              # GET (for monitoring)
│
├── lib/
│   ├── auth/
│   │   ├── session.ts               # ✓ Session resolution
│   │   └── handlers.ts              # Login/logout handlers
│   ├── rbac/
│   │   └── require-permission.ts    # ✓ Permission checks
│   ├── audit/
│   │   └── log.ts                   # ✓ Audit logging
│   ├── rate-limit/
│   │   └── limiter.ts               # ✓ Rate limiting
│   ├── supabase/
│   │   ├── server.ts                # ✓ Server clients
│   │   └── client.ts                # ✓ Browser client
│   ├── validators.ts                # Zod schemas for inputs
│   ├── session-context.ts           # React Context for session
│   ├── api-client.ts                # Fetch wrapper (error handling)
│   └── errors.ts                    # Custom error classes
│
├── components/
│   ├── SessionProvider.tsx          # Wraps app with SessionContext
│   ├── ProtectedRoute.tsx           # Guards protected pages
│   ├── Navigation.tsx               # Top nav with user menu
│   ├── Sidebar.tsx                  # Left sidebar with links
│   ├── ErrorBoundary.tsx            # Catches React errors
│   └── Loading.tsx                  # Loading spinner
│
└── middleware.ts                    # ✓ Edge security + auth rate limit
```

---

## 🏗️ PHASE 2 ENDPOINTS CHECKLIST

### Authentication (Week 1)
- [ ] `POST /api/auth/login` — Email/password login
- [ ] `POST /api/auth/logout` — Clear session
- [ ] `GET /api/auth/me` — Current session info
- [ ] `POST /api/auth/switch-org` — Change org (multi-org users)

### Products (Week 3)
- [ ] `GET /api/products` — List all products (paginated)
  - Query: `?page=1&limit=50&search=iphone`
  - Permission: `products.view`
  - RLS: org-scoped
  
- [ ] `POST /api/products` — Create product
  - Permission: `products.create`
  - Fields: name, sku, description, price
  - Validation: name required, price ≥ 0
  
- [ ] `GET /api/products/[id]` — Get single product
  - Permission: `products.view`
  
- [ ] `PATCH /api/products/[id]` — Update product
  - Permission: `products.edit`
  - Track: before/after values
  
- [ ] `DELETE /api/products/[id]` — Delete product
  - Permission: `products.delete`
  - Soft delete (set status='deleted')

### Inventory (Week 3)
- [ ] `GET /api/inventory` — View current stock
  - Permission: `inventory.view`
  
- [ ] `POST /api/inventory/adjust` — Adjust stock (✓ reference exists)
  - Permission: `inventory.adjust`
  - Validation: quantity ≠ 0, reason required
  - Event-sourced: inserts movement, triggers total update
  
- [ ] `GET /api/inventory/movements` — Movement history
  - Permission: `inventory.view`
  - Filters: date range, product, type

### Orders (Week 4)
- [ ] `GET /api/orders` — List orders
  - Permission: `orders.view`
  - Filters: status, date range, customer
  
- [ ] `POST /api/orders` — Create order
  - Permission: `orders.create`
  - Fields: customer_id, items[], notes
  - Validation: items not empty
  - Audit: log order creation
  
- [ ] `GET /api/orders/[id]` — Order details
  - Permission: `orders.view`
  
- [ ] `PATCH /api/orders/[id]` — Update order
  - Permission: `orders.edit`
  
- [ ] `POST /api/orders/[id]/transition` — Change status
  - Permission: `orders.transition`
  - Valid transitions: pending → processing → shipped → delivered
  - Audit: log each transition

---

## 🎨 UI COMPONENTS FOR PHASE 2

### Authentication Pages
**`app/(auth)/login/page.tsx`**
```
┌─────────────────────────────┐
│  LOGIN                      │
├─────────────────────────────┤
│                             │
│  Email     ___________      │
│  Password  ___________      │
│  Org ID    ___________      │
│                             │
│  [LOGIN]        [SIGN UP]   │
│                             │
│  Forgot password?           │
│                             │
└─────────────────────────────┘
```

### Dashboard
**`app/(app)/dashboard/page.tsx`**
```
┌──────────────────────────────────────┐
│ NavBar: Thevey Brand | User | Logout │
├──────────────────────────────────────┤
│                                      │
│ Sidebar:              Main Content   │
│ • Dashboard        ┌──────────────┐  │
│ • Inventory        │ Dashboard    │  │
│ • Orders      100  │ Overview     │  │
│ • Finance          │              │  │
│ • Reports          │ KPIs:        │  │
│ • Settings         │ • Orders: 42 │  │
│                    │ • Revenue: $│  │
│                    │ • Stock:  95%│  │
│                    └──────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### Products/Inventory
**`app/(app)/inventory/page.tsx`**
```
┌──────────────────────────────────────┐
│ INVENTORY                            │
├──────────────────────────────────────┤
│ [Search ________] [Filter] [+ Add]   │
├──────────────────────────────────────┤
│ Product   | SKU     | Stock | Actions│
├──────────────────────────────────────┤
│ iPhone 15 | SKU-001 | 45   | Edit    │
│ AirPods   | SKU-002 | 120  | Edit    │
│ Apple TV  | SKU-003 | 8    | Edit    │
├──────────────────────────────────────┤
│ [< Previous] Page 1 of 5 [Next >]   │
└──────────────────────────────────────┘
```

### Orders
**`app/(app)/orders/page.tsx`**
```
┌──────────────────────────────────────┐
│ ORDERS                               │
├──────────────────────────────────────┤
│ [Search ________] [Status Filter] [+] │
├──────────────────────────────────────┤
│ Order  | Customer | Status    | Date │
├──────────────────────────────────────┤
│ #1001  | John Doe | Delivered | 8/12 │
│ #1002  | Jane Sm. | Shipped   | 8/12 │
│ #1003  | Bob Johnson | Pending | 8/11 │
├──────────────────────────────────────┤
│ [< Previous] Page 1 of 3 [Next >]   │
└──────────────────────────────────────┘
```

---

## 🚨 MIGRATION RISKS & MITIGATIONS

### Risk 1: Session Loss During Navigation
**Problem:** User navigates from /dashboard → /products, session expires mid-way
**Mitigation:**
- ✅ Middleware refreshes JWT on every request
- ✅ Refresh token valid for 48h (covers most use cases)
- ✅ Client catches 401 → redirects to login
- ✅ Store current URL in localStorage (redirect after re-login)

### Risk 2: Race Condition in Stock Adjustment
**Problem:** Two users adjust same product stock simultaneously
**Mitigation:**
- ✅ Event-sourced: movements are immutable INSERTs (no UPDATE race)
- ✅ Stock total recalculated from movements via trigger
- ✅ Even if delayed, never lost (just calculated later)

### Risk 3: Permission Revoked During Request
**Problem:** User clicks "edit order", permission revoked mid-request
**Mitigation:**
- ✅ App layer: permission checked before mutation
- ✅ DB layer: RLS re-checked at query time
- ✅ Worst case: user sees 403 after clicking (acceptable)

### Risk 4: SQL Injection via User Input
**Problem:** User enters `'; DROP TABLE orders; --` in product name
**Mitigation:**
- ✅ Supabase parameterizes all queries
- ✅ Input validation with Zod (server-side)
- ✅ Never concatenate user input into SQL

### Risk 5: XSS via Product Description
**Problem:** User uploads product with `<script>alert('hacked')</script>` in description
**Mitigation:**
- ✅ React auto-escapes JSX strings
- ✅ DOMPurify for rich-text fields
- ✅ CSP headers prevent inline scripts

### Risk 6: Error Messages Expose Sensitive Data
**Problem:** Error: "User 123 in org 456 doesn't have permission code.auth.login"
**Mitigation:**
- ✅ Return generic errors: `{ error: "Request failed" }`
- ✅ Log details server-side with context
- ✅ Wire to error monitoring (Sentry)

### Risk 7: CSRF Attack
**Problem:** Attacker tricks user into submitting form from malicious site
**Mitigation:**
- ✅ Next.js only allows POST/PUT/DELETE from same-origin
- ✅ SameSite=Lax on auth cookies
- ✅ No GET mutations (all side-effects via POST/PATCH/DELETE)

### Risk 8: DoS via Expensive Queries
**Problem:** Attacker requests export of 10 million orders → server hangs
**Mitigation:**
- ✅ Pagination enforced (max 1000 rows per request)
- ✅ Query timeout: 30s max
- ✅ Rate limit: 100 reads/min per user
- ✅ Request body size limit: 10MB

### Risk 9: Stale Session Across Tabs
**Problem:** User logs out in Tab A, Tab B still acts as logged-in
**Mitigation:**
- ✅ BroadcastChannel API syncs logout across tabs
- ✅ Tab B clears state when Tab A broadcasts logout
- ✅ Tab B redirects to login immediately

### Risk 10: Audit Log Corruption
**Problem:** User edits audit log to hide deleted orders
**Mitigation:**
- ✅ Database constraint: INSERT-only (no UPDATE/DELETE)
- ✅ Even admin can't edit audit logs
- ✅ Immutable: safe for compliance

---

## 📊 DATABASE SCHEMA ADDITIONS (Phase 2)

### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Customers Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered
  total_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ
);
```

All tables get:
- ✅ `organization_id` (multi-tenant)
- ✅ RLS policies (org-isolated)
- ✅ Audit logging on mutations

---

## 🧪 TESTING STRATEGY FOR PHASE 2

### Unit Tests
```typescript
// Example: Permission validation
describe('requirePermission', () => {
  it('allows user with permission', async () => {
    const session = { userId: '1', organizationId: 'org1' };
    // Create role with permission in DB
    await expect(requirePermission(session, 'products.edit')).resolves.not.toThrow();
  });
  
  it('denies user without permission', async () => {
    const session = { userId: '2', organizationId: 'org1' };
    // User has no role
    await expect(requirePermission(session, 'products.edit')).rejects.toThrow(ForbiddenError);
  });
});
```

### Integration Tests
```typescript
// Example: Create product endpoint
describe('POST /api/products', () => {
  it('creates product for authorized user', async () => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: JSON.stringify({ name: 'iPhone', sku: 'SKU-001', price: 999 })
    });
    expect(res.status).toBe(201);
  });
  
  it('rejects unauthorized user', async () => {
    const res = await fetch('/api/products', {
      method: 'POST',
      // No cookie
      body: JSON.stringify({ name: 'iPhone', sku: 'SKU-001', price: 999 })
    });
    expect(res.status).toBe(401);
  });
  
  it('rejects invalid input', async () => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: JSON.stringify({ name: '', sku: 'SKU-001', price: -50 }) // invalid
    });
    expect(res.status).toBe(400);
  });
});
```

### Manual Test Scenarios
Before each deployment:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (rate limit after 5 attempts)
- [ ] Navigate dashboard → products → orders (session persists)
- [ ] Create product (audit log created)
- [ ] Adjust inventory (stock updated)
- [ ] Logout in Tab A, verify Tab B is logged out
- [ ] Logout, refresh page, should be at login
- [ ] Expired session, make request, should redirect to login
- [ ] Network error during request, show retry button
- [ ] Permission denied (403), show "Access denied" message

---

## 📅 PHASE 2 TIMELINE

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Auth & Sessions | Login/logout endpoints, SessionProvider, protected routes |
| 2 | Dashboard & Nav | Dashboard layout, navigation, org switcher, user settings |
| 3 | Products | Products CRUD, inventory adjust, product management UI |
| 4 | Orders | Orders CRUD, order status, order tracking UI |

---

## 🎯 SUCCESS CRITERIA FOR PHASE 2

- ✅ Users can log in with email/password
- ✅ Session persists across page navigation
- ✅ Logout clears all data and redirects to login
- ✅ Expired sessions redirect to login (no errors shown to user)
- ✅ Navigation shows only permitted pages/actions
- ✅ All endpoints have permission checks
- ✅ All mutations logged to audit_logs
- ✅ No errors exposed to client (generic messages only)
- ✅ Rate limiting works (can test via rapid requests)
- ✅ Multi-tab logout synced (logout in Tab A → Tab B logged out)
- ✅ All tests pass (unit + integration)
- ✅ No vulnerabilities in OWASP Top 10

---

## 📌 NEXT IMMEDIATE STEPS

1. **Update .env.local** — ✅ Done with Supabase credentials
2. **Run migrations** — `npx supabase db push`
3. **Create seed data** — Insert test org, user, roles
4. **Build login UI** — Week 1 focus
5. **Implement SessionProvider** — Wrap app with context
6. **Test login flow** — Verify session persists

---

**Status:** Ready for Phase 2 development  
**Blocked by:** Supabase migrations (need service-role key to apply)  
**Dependencies:** None  
**Risk Level:** LOW (foundation is solid, migration straightforward)

---
