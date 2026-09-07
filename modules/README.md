# Business service boundaries

This application is a modular monolith. Each major capability owns its business
rules under `modules/<capability>` and exposes a small service API to route
handlers, Server Actions, jobs, and other modules.

Current modules:

- `authentication`: identity and Supabase Auth session operations.
- `security`: request trust checks, security headers, and security telemetry.

Planned top-level modules include `organizations`, `products`, `inventory`,
`crm`, `orders`, `finance`, `notifications`, `audit`, and `analytics`. Add each
when its first use case is implemented; do not create shared CRUD services.

Boundary rules:

1. `app/` is a transport/UI layer. Routes validate transport concerns and call services.
2. A module owns its validation, domain types, state transitions, and service functions.
3. Cross-module work calls another module's public service API; it does not write that module's tables directly.
4. User operations use the request-bound anon client and RLS. Service-role access belongs only in a narrowly scoped backend/security adapter.
5. Every business table is organization-scoped. Organization identity comes from the verified session, never request input.
6. Financial and inventory changes use immutable ledgers and auditable transactions.
7. A module may later be extracted behind an API without changing its callers' business contract.
