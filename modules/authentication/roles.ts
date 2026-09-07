import type { AuthenticatedUser, SandboxRole } from "./domain";

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
      "products.create",
      "orders.cancel",
      "audit.view",
    ],
  },
  sales_manager: {
    label: "Sales Manager",
    description: "Pipeline, customers, orders and team performance",
    permissions: [
      "dashboard.sales",
      "analytics.sales.view",
      "crm.view",
      "crm.manage",
      "orders.view",
      "orders.create",
      "orders.cancel",
      "team.sales.view",
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
    ],
  },
};

export function hasPermission(
  user: Pick<AuthenticatedUser, "permissions">,
  permission: string
): boolean {
  return user.permissions.includes(permission);
}
