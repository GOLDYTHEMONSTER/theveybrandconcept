-- =====================================================================
-- Minimal inventory tables — just enough for the reference
-- app/api/inventory/adjust/route.ts to run against real schema.
-- Full product/order/commerce schema belongs to Phase 2 of the build
-- plan; this file only exists so Phase 1's audit/permission/rate-limit
-- pattern has a concrete table to demonstrate against.
--
-- Event-sourced by design: `inventory.stock` is a derived total,
-- `inventory_movements` is the source of truth. Never update stock
-- directly from application code — always insert a movement and let
-- the trigger recompute the total.
-- =====================================================================

create table if not exists inventory (
  product_id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  stock integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null,
  type text not null check (type in ('purchase', 'sale', 'return', 'damage', 'adjustment', 'transfer', 'stock_count')),
  quantity integer not null,       -- signed: positive = increase, negative = decrease
  reference text,                  -- e.g. order id
  actor_id uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_org on inventory(organization_id);
create index if not exists idx_movements_org_product on inventory_movements(organization_id, product_id);

alter table inventory enable row level security;
alter table inventory_movements enable row level security;

create policy inventory_select on inventory
  for select using (is_org_member(organization_id));
create policy inventory_write on inventory
  for all using (has_permission(organization_id, 'inventory.adjust'))
  with check (has_permission(organization_id, 'inventory.adjust'));

create policy movements_select on inventory_movements
  for select using (is_org_member(organization_id));
create policy movements_insert on inventory_movements
  for insert with check (has_permission(organization_id, 'inventory.adjust'));
-- no update/delete policy: movement history is append-only, same rule as audit_logs

-- Recompute inventory.stock whenever a movement is inserted.
create or replace function apply_inventory_movement()
returns trigger language plpgsql security definer as $$
begin
  insert into inventory (product_id, organization_id, stock, updated_at)
  values (new.product_id, new.organization_id, new.quantity, now())
  on conflict (product_id)
  do update set stock = inventory.stock + new.quantity, updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_apply_inventory_movement on inventory_movements;
create trigger trg_apply_inventory_movement
  after insert on inventory_movements
  for each row execute function apply_inventory_movement();
