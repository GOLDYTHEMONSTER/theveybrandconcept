create table if not exists login_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  identifier_hash text not null,
  ip_address inet,
  user_agent text,
  status text not null check (status in ('success', 'failure')),
  failure_reason text check (
    failure_reason is null or
    failure_reason in ('invalid_credentials', 'invalid_request', 'server_error')
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_login_events_user_created
  on login_events(user_id, created_at desc);
create index if not exists idx_login_events_identifier_created
  on login_events(identifier_hash, created_at desc);
create index if not exists idx_login_events_ip_created
  on login_events(ip_address, created_at desc);

alter table login_events enable row level security;
-- No policies: browser/user clients cannot read or mutate security telemetry.
