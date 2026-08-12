# Foundation Database Schema Summary

This document describes what gets created when you run `npx supabase db push`.

---

## Tables Overview

### Authentication & Organization Layer

**`organizations`** — Customer tenants
```
id (uuid, primary key)
name (text)
created_at (timestamp)
```

**`profiles`** — User accounts (created by Supabase Auth)
```
id (uuid, primary key - linked to auth.users)
email (text)
full_name (text)
created_at (timestamp)
```

**`organization_members`** — Who belongs to which org + department
```
id (uuid, primary key)
organization_id (uuid, foreign key)
profile_id (uuid, foreign key)
department_id (uuid, foreign key, nullable)
status (text: 'active' | 'suspended' | 'inactive')
created_at (timestamp)
RLS: Users see only their own orgs
```

**`departments`** — Org structure (Finance, HR, Sales, Inventory, etc.)
```
id (uuid, primary key)
organization_id (uuid, foreign key)
name (text)
created_at (timestamp)
RLS: Org-isolated
```

---

### Authorization Layer

**`permissions`** — Atomic actions
```
id (uuid, primary key)
code (text, unique: e.g., 'inventory.adjust', 'finance.export')
description (text)
created_at (timestamp)
```

**`roles`** — Job responsibilities
```
id (uuid, primary key)
organization_id (uuid, foreign key)
name (text: e.g., 'Finance Manager', 'Inventory Staff')
description (text)
created_at (timestamp)
RLS: Org-isolated
```

**`role_permissions`** — Link roles to permissions
```
id (uuid, primary key)
role_id (uuid, foreign key)
permission_id (uuid, foreign key)
created_at (timestamp)
RLS: Accessible to admins of the role's org
```

**`member_roles`** — Assign roles to users per org/dept
```
id (uuid, primary key)
organization_id (uuid, foreign key)
member_id (uuid, foreign key → organization_members)
role_id (uuid, foreign key)
department_id (uuid, foreign key, nullable)
created_at (timestamp)
RLS: Users see only their own org's assignments
```

---

### Audit & Compliance

**`audit_logs`** — Append-only, never update/delete
```
id (uuid, primary key)
organization_id (uuid, foreign key)
actor_id (uuid, foreign key → profiles, nullable for system actions)
action (text: 'login', 'create_user', 'adjust_inventory', etc.)
resource_type (text: 'user', 'organization', 'inventory', etc.)
resource_id (text or uuid)
changes (jsonb: {before: {...}, after: {...}})
ip_address (text, nullable)
user_agent (text, nullable)
created_at (timestamp)
RLS: Users see org logs only; immutable (no UPDATE/DELETE)
```

---

### Rate Limiting (Postgres Fallback)

**`rate_limit_events`** — Tracks rate limit hits (used if Redis unavailable)
```
id (uuid, primary key)
bucket (text: '{userId}:{orgId}' for API, '{ip}' for auth)
rule (text: 'auth_login', 'api_write', etc.)
hit_count (integer)
reset_at (timestamp)
created_at (timestamp)
Indexes on: (bucket, rule) for fast lookup
```

---

### Business Data (Examples)

**`inventory_movements`** — Event-sourced inventory (demo)
```
id (uuid, primary key)
organization_id (uuid, foreign key)
product_id (uuid, foreign key → products)
quantity_delta (integer: positive or negative)
movement_type (text: 'sale', 'purchase', 'return', 'damage', 'adjustment', 'transfer')
reason (text)
created_by (uuid, foreign key → profiles)
created_at (timestamp)
RLS: Users see org's inventory only
```

---

## RLS Policies (Security)

Every table has these policies:

### `is_org_member()` — Are you in this org?
```sql
CREATE FUNCTION is_org_member(org_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND profile_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### `has_permission()` — Do you have this permission?
```sql
CREATE FUNCTION has_permission(
  p_organization_id uuid,
  p_permission_code text
) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM member_roles mr
    JOIN roles r ON r.id = mr.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE mr.organization_id = p_organization_id
      AND mr.member_id IN (
        SELECT id FROM organization_members
        WHERE profile_id = auth.uid()
          AND organization_id = p_organization_id
          AND status = 'active'
      )
      AND p.code = p_permission_code
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Example: Creating a New Table

When you add a new business table (e.g., `customers`), always include:

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's customers
CREATE POLICY "org_members_can_read_customers" ON customers
  FOR SELECT USING (is_org_member(organization_id));

-- Only users with 'customers.edit' permission can update
CREATE POLICY "permission_required_to_edit_customers" ON customers
  FOR UPDATE USING (has_permission(organization_id, 'customers.edit'));

-- Only users with 'customers.create' permission can insert
CREATE POLICY "permission_required_to_create_customers" ON customers
  FOR INSERT WITH CHECK (
    is_org_member(organization_id)
    AND has_permission(organization_id, 'customers.create')
  );
```

---

## Permissions Included in Foundation

The `0001_foundation.sql` seeds these permissions:

**Inventory:**
- `inventory.view` — see inventory
- `inventory.adjust` — adjust stock
- `inventory.export` — export reports

**Finance:**
- `finance.view` — see financial data
- `finance.edit` — modify financial records
- `finance.export` — export financial reports
- `finance.approve` — approve transactions

**HR:**
- `hr.profile.view` — see employee profiles
- `hr.payroll.view` — see payroll data
- `hr.payroll.edit` — modify payroll
- `hr.leave.manage` — manage leave requests

**Admin:**
- `admin.users.manage` — create/edit/deactivate users
- `admin.roles.manage` — create/assign roles
- `admin.audit.view` — view audit logs

Add more permissions as modules grow.

---

## Testing the Setup

Once migrations are applied:

### List all tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Check RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

### See RLS policies
```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Next Steps

1. Insert seed data (test user, org, roles, permissions)
2. Test auth flow: `/api/auth/login`
3. Test protected route: `/api/inventory/adjust`
4. Review audit logs
5. Start building Phase 2 modules

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for more.
