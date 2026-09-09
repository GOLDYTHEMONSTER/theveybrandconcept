export interface NavItem {
  label: string;
  icon: "home" | "orders" | "returns" | "recovery" | "customers" | "inventory" | "support" | "finance" | "analytics" | "team" | "audit" | "settings";
  href: string;
  permission: string | string[] | null;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", icon: "home", href: "/dashboard", permission: null },
  { label: "Orders", icon: "orders", href: "/orders", permission: "orders.view" },
  { label: "Returns", icon: "returns", href: "/returns", permission: "orders.view" },
  { label: "Recovery", icon: "recovery", href: "/recovery", permission: "orders.view" },
  { label: "Customers", icon: "customers", href: "/customers", permission: "crm.view" },
  { label: "Inventory", icon: "inventory", href: "/inventory", permission: "inventory.view" },
  { label: "Support", icon: "support", href: "/support", permission: "support.view" },
  { label: "Finance", icon: "finance", href: "/finance", permission: "finance.view" },
  { label: "Analytics", icon: "analytics", href: "/analytics", permission: "analytics.view" },
  { label: "Team", icon: "team", href: "/team", permission: ["team.view", "team.sales.view"] },
  { label: "Audit & Security", icon: "audit", href: "/audit", permission: "audit.view" },
  { label: "Settings", icon: "settings", href: "/settings", permission: null },
];
