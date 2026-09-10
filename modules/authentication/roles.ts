import type { SandboxRole } from "./domain";

export interface RoleDefinition {
  label: string;
  description: string;
  permissions: string[];
}

export const ROLE_DEFINITIONS: Record<SandboxRole, RoleDefinition> = {
  executive: {
    label: "Executive",
    description: "Organization-wide performance and approvals",
    permissions: [
      "dashboard.executive",
      "analytics.view",
      "orders.view",
      "inventory.view",
      "crm.view",
      "finance.view",
      "team.view",
      "team.manage",
      "products.create",
      "orders.cancel",
      "audit.view",
      "attendance.view",
      "attendance.manage",
      "tasks.view",
      "tasks.manage",
    ],
  },
  sales_manager: {
    label: "Sales Manager",
    description: "Pipeline, customers, orders and team performance",
    permissions: [
      "dashboard.sales",
      "analytics.view",
      "crm.view",
      "crm.manage",
      "orders.view",
      "orders.create",
      "orders.cancel",
      "team.sales.view",
      "attendance.view",
      "tasks.view",
      "tasks.manage",
    ],
  },
  warehouse_manager: {
    label: "Warehouse Manager",
    description: "Inventory, fulfilment and stock movement",
    permissions: [
      "dashboard.warehouse",
      "inventory.view",
      "inventory.adjust",
      "inventory.transfer",
      "orders.view",
      "orders.fulfil",
      "procurement.view",
      "products.create",
      "attendance.view",
      "tasks.view",
      "tasks.manage",
    ],
  },
  customer_support: {
    label: "Customer Support",
    description: "Customers, tickets and order assistance",
    permissions: [
      "dashboard.support",
      "crm.view",
      "orders.view",
      "support.view",
      "support.respond",
      "attendance.view",
      "tasks.view",
    ],
  },
  hr_manager: {
    label: "HR Manager",
    description: "The team roster, attendance and task allocation",
    permissions: [
      "dashboard.hr",
      "team.view",
      "team.manage",
      "attendance.view",
      "attendance.manage",
      "tasks.view",
      "tasks.manage",
    ],
  },
};

export interface PermissionDefinition {
  key: string;
  label: string;
  group: string;
}

/**
 * Every permission string an ERP route actually checks (requirePagePermission
 * / guardMutation / an inline session.permissions.includes). This is the
 * catalog the Team > Permissions page renders — kept separate from each
 * role's own list so an account's *effective* grants can differ from its
 * role's defaults (see getEffectivePermissions).
 */
export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { key: "dashboard.executive", label: "View executive dashboard", group: "Dashboard" },
  { key: "dashboard.sales", label: "View sales dashboard", group: "Dashboard" },
  { key: "dashboard.warehouse", label: "View warehouse dashboard", group: "Dashboard" },
  { key: "dashboard.support", label: "View support dashboard", group: "Dashboard" },
  { key: "dashboard.hr", label: "View HR dashboard", group: "Dashboard" },
  { key: "analytics.view", label: "View analytics", group: "Analytics" },
  { key: "orders.view", label: "View orders", group: "Orders" },
  { key: "orders.create", label: "Create orders", group: "Orders" },
  { key: "orders.cancel", label: "Cancel orders", group: "Orders" },
  { key: "orders.fulfil", label: "Process, ship & deliver orders", group: "Orders" },
  { key: "crm.view", label: "View customers", group: "Customers" },
  { key: "crm.manage", label: "Manage customer records", group: "Customers" },
  { key: "inventory.view", label: "View inventory", group: "Inventory" },
  { key: "inventory.adjust", label: "Adjust stock levels", group: "Inventory" },
  { key: "inventory.transfer", label: "Transfer stock between warehouses", group: "Inventory" },
  { key: "products.create", label: "Create products", group: "Inventory" },
  { key: "procurement.view", label: "View procurement", group: "Inventory" },
  { key: "finance.view", label: "View finance", group: "Finance" },
  { key: "support.view", label: "View support tickets", group: "Support" },
  { key: "support.respond", label: "Respond to support tickets", group: "Support" },
  { key: "team.view", label: "View the full team roster", group: "Team" },
  { key: "team.sales.view", label: "View the sales team roster", group: "Team" },
  { key: "team.manage", label: "Invite teammates & manage permissions", group: "Team" },
  { key: "onboarding.view", label: "View your own onboarding checklist", group: "Team" },
  { key: "audit.view", label: "View the audit log", group: "Security" },
  { key: "attendance.view", label: "Clock in/out & view own attendance", group: "Attendance" },
  { key: "attendance.manage", label: "View & manage everyone's attendance", group: "Attendance" },
  { key: "tasks.view", label: "View tasks assigned to you", group: "Tasks" },
  { key: "tasks.manage", label: "Create & assign tasks to teammates", group: "Tasks" },
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map((permission) => permission.key);

export interface PermissionOverrides {
  granted: string[];
  revoked: string[];
}

/**
 * An account's real permission set: its role's defaults, plus anything
 * granted to it specifically, minus anything revoked from it specifically.
 * Order matters -- an explicit revoke always wins over the role default.
 */
export function getEffectivePermissions(role: SandboxRole, overrides?: PermissionOverrides): string[] {
  const effective = new Set(ROLE_DEFINITIONS[role].permissions);
  overrides?.granted.forEach((permission) => effective.add(permission));
  overrides?.revoked.forEach((permission) => effective.delete(permission));
  return Array.from(effective);
}
