-- =====================================================================
-- PHASE 1 FOUNDATION SCHEMA
-- Auth -> Organizations -> Departments -> Roles -> Permissions -> RLS -> Audit
--
-- Design rules encoded in this file:
--   1. Every business table carries organization_id and is isolated by RLS.
--   2. Authorization is never trusted from the client / JWT claims alone.
--      Every check re-derives permissions from the database via
--      has_permission() / is_org_member(), which RLS policies call.
--   3. Audit logs are append-only: INSERT allowed, UPDATE/DELETE blocked
--      for everyone except a locked-down service role.
--   4. Account tier gates MODULES; role/permission gates ACTIONS.
--      Both must pass (see has_permission()).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ORGANIZATIONS & TIERS
-- ---------------------------------------------------------------------

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  tier text not null default 'business' check (tier in ('business', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which modules a tier unlocks. Keeps tier->module mapping data-driven
-- instead of hardcoded in application code.
create table if not exists tier_modules (
  tier text not null,
  module text not null,
  primary key (tier, module)
);

insert into tier_modules (tier, module) values
  ('business', 'sales'), ('business', 'inventory'), ('business', 'orders'),
  ('business', 'support'), ('business', 'analytics'),
  ('enterprise', 'sales'), ('enterprise', 'inventory'), ('enterprise', 'orders'),
  ('enterprise', 'support'), ('enterprise', 'analytics'),
  ('enterprise', 'hr'), ('enterprise', 'finance'),
  ('enterprise', 'advanced_analytics'), ('enterprise', 'api')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- PROFILES (1:1 with auth.users) & MEMBERSHIP
-- ---------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create index if not exists idx_org_members_org on organization_members(organization_id);
create index if not exists idx_org_members_profile on organization_members(profile_id);

-- ---------------------------------------------------------------------
-- RBAC: roles, permissions, role_permissions, member_roles
-- ---------------------------------------------------------------------

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,               -- e.g. "Finance Manager"
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,        -- e.g. "inventory.adjust"
  module text not null,             -- e.g. "inventory"  (must match tier_modules.module)
  description text
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  -- optional data scope: 'own' | 'department' | 'organization'
  data_scope text not null default 'organization'
    check (data_scope in ('own', 'department', 'organization')),
  primary key (role_id, permission_id)
);

create table if not exists member_roles (
  organization_member_id uuid not null references organization_members(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references profiles(id),
  primary key (organization_member_id, role_id)
);

-- seed a baseline permission set (extend per module as you build it)
insert into permissions (code, module, description) values
  ('inventory.view',    'inventory', 'View inventory records'),
  ('inventory.create',  'inventory', 'Create inventory items'),
  ('inventory.edit',    'inventory', 'Edit inventory items'),
  ('inventory.adjust',  'inventory', 'Adjust stock levels'),
  ('inventory.transfer','inventory', 'Transfer stock between locations'),
  ('inventory.export',  'inventory', 'Export inventory data'),
  ('sales.view',        'sales',     'View sales records'),
  ('sales.create',      'sales',     'Create sales/orders'),
  ('orders.view',       'orders',    'View orders'),
  ('orders.transition', 'orders',    'Change order status'),
  ('finance.view',      'finance',   'View financial records'),
  ('finance.record',    'finance',   'Record financial transactions'),
  ('finance.reverse',   'finance',   'Create correction/reversal entries'),
  ('hr.profile.view',   'hr',        'View employee profiles'),
  ('hr.payroll.view',   'hr',        'View payroll data'),
  ('org.roles.manage',  'org',       'Manage roles and permission assignments'),
  ('org.members.manage','org',       'Manage organization membership')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- AUDIT LOG (append-only)
-- ---------------------------------------------------------------------

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  department_id uuid references departments(id),
  action text not null,              -- e.g. "inventory.adjust"
  entity_type text,                  -- e.g. "product"
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_org_created on audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_entity on audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- RATE LIMITING LEDGER (backstop for DB-visible/abuse-sensitive actions;
-- primary edge/API rate limiting lives in the app layer, see lib/rate-limit)
-- ---------------------------------------------------------------------

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  bucket_key text not null,      -- e.g. "login:<ip>" or "api:<org>:<user>:<route>"
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_bucket_time on rate_limit_events(bucket_key, created_at desc);

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer, used inside RLS policies)
-- ---------------------------------------------------------------------

-- Is the current auth.uid() an active member of this organization?
create or replace function is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from organization_members om
    where om.organization_id = p_organization_id
      and om.profile_id = auth.uid()
      and om.status = 'active'
  );
$$;

-- Does the current user hold permission `p_permission_code` in this org,
-- AND does the org's tier include the permission's module?
create or replace function has_permission(p_organization_id uuid, p_permission_code text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from organization_members om
    join member_roles mr on mr.organization_member_id = om.id
    join role_permissions rp on rp.role_id = mr.role_id
    join permissions p on p.id = rp.permission_id
    join organizations o on o.id = om.organization_id
    join tier_modules tm on tm.tier = o.tier and tm.module = p.module
    where om.organization_id = p_organization_id
      and om.profile_id = auth.uid()
      and om.status = 'active'
      and p.code = p_permission_code
      and o.status = 'active'
  );
$$;

-- Convenience: does the current user have a permission scoped to their
-- own department (used for department-scoped RLS policies)?
create or replace function has_department_permission(p_department_id uuid, p_permission_code text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from organization_members om
    join member_roles mr on mr.organization_member_id = om.id
    join role_permissions rp on rp.role_id = mr.role_id
    join permissions p on p.id = rp.permission_id
    where om.department_id = p_department_id
      and om.profile_id = auth.uid()
      and om.status = 'active'
      and p.code = p_permission_code
  );
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table organizations enable row level security;
alter table tier_modules enable row level security;
alter table profiles enable row level security;
alter table departments enable row level security;
alter table organization_members enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table member_roles enable row level security;
alter table audit_logs enable row level security;
alter table rate_limit_events enable row level security;

-- organizations: members can read their own org; nobody writes via client
create policy org_select_member on organizations
  for select using (is_org_member(id));

-- tier_modules & permissions: reference data, readable by any authenticated user
create policy tier_modules_read on tier_modules
  for select using (auth.role() = 'authenticated');
create policy permissions_read on permissions
  for select using (auth.role() = 'authenticated');

-- profiles: a user can see/update only their own profile row;
-- org-mates are visible via organization_members join in app queries,
-- not by opening profiles broadly.
create policy profile_select_self on profiles
  for select using (id = auth.uid());
create policy profile_update_self on profiles
  for update using (id = auth.uid());

-- departments: visible to org members
create policy departments_select on departments
  for select using (is_org_member(organization_id));
create policy departments_write on departments
  for all using (has_permission(organization_id, 'org.members.manage'))
  with check (has_permission(organization_id, 'org.members.manage'));

-- organization_members: visible to org members; writable only by org admins
create policy org_members_select on organization_members
  for select using (is_org_member(organization_id));
create policy org_members_write on organization_members
  for all using (has_permission(organization_id, 'org.members.manage'))
  with check (has_permission(organization_id, 'org.members.manage'));

-- roles / role_permissions / member_roles: readable by org members,
-- writable only by holders of org.roles.manage
create policy roles_select on roles
  for select using (is_org_member(organization_id));
create policy roles_write on roles
  for all using (has_permission(organization_id, 'org.roles.manage'))
  with check (has_permission(organization_id, 'org.roles.manage'));

create policy role_permissions_select on role_permissions
  for select using (
    exists (select 1 from roles r where r.id = role_id and is_org_member(r.organization_id))
  );
create policy role_permissions_write on role_permissions
  for all using (
    exists (
      select 1 from roles r
      where r.id = role_id and has_permission(r.organization_id, 'org.roles.manage')
    )
  );

create policy member_roles_select on member_roles
  for select using (
    exists (
      select 1 from organization_members om
      where om.id = organization_member_id and is_org_member(om.organization_id)
    )
  );
create policy member_roles_write on member_roles
  for all using (
    exists (
      select 1 from organization_members om
      where om.id = organization_member_id
        and has_permission(om.organization_id, 'org.roles.manage')
    )
  );

-- audit_logs: append-only. Members with no explicit permission can still
-- INSERT (the app always writes as the acting user) but SELECT is
-- restricted, and UPDATE/DELETE are granted to nobody.
create policy audit_insert on audit_logs
  for insert with check (is_org_member(organization_id));
create policy audit_select on audit_logs
  for select using (is_org_member(organization_id));
-- deliberately no update/delete policy -> blocked for all non-service-role clients

-- rate_limit_events: service-role only (no policy = no client access).
-- Application/edge layer writes these using the service role key server-side.

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_org_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Auto-create a profile row when a Supabase Auth user is created
-- ---------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
