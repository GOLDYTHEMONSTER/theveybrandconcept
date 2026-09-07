import type { AuthenticatedUser, SandboxRole } from "./domain";
import { ROLE_DEFINITIONS } from "./roles";

const DEMO_PASSWORD = "Demo123!";

const USERS: Array<{ id: string; email: string; name: string; role: SandboxRole }> = [
  { id: "sandbox-executive", email: "executive@theveybrand.com", name: "Veronica Young", role: "executive" },
  { id: "sandbox-sales", email: "sales@theveybrand.com", name: "Amara Okafor", role: "sales_manager" },
  { id: "sandbox-warehouse", email: "warehouse@theveybrand.com", name: "David Chen", role: "warehouse_manager" },
  { id: "sandbox-support", email: "support@theveybrand.com", name: "Ife Bello", role: "customer_support" },
];

export const SANDBOX_DEMO_PASSWORD = DEMO_PASSWORD;

export const SANDBOX_DEMO_USERS = USERS.map(({ email, name, role }) => ({
  email,
  name,
  role,
  roleLabel: ROLE_DEFINITIONS[role].label,
}));

export function authenticateSandboxUser(email: string, password: string): AuthenticatedUser | null {
  if (password !== DEMO_PASSWORD) return null;
  const match = USERS.find((user) => user.email === email.toLowerCase());
  if (!match) return null;
  const definition = ROLE_DEFINITIONS[match.role];

  return {
    ...match,
    roleLabel: definition.label,
    organizationId: "theveybrand-sandbox",
    organizationName: "Veronica Young Brand",
    permissions: definition.permissions,
  };
}
