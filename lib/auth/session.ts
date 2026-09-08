import { redirect } from "next/navigation";
import { getSandboxSession } from "../../modules/authentication/session";
import type { SandboxRole } from "../../modules/authentication/domain";

export class UnauthenticatedError extends Error {}
export class NoOrganizationError extends Error {}

export interface SessionContext {
  userId: string;
  organizationId: string;
  departmentId: string | null;
  memberId: string;
  name: string;
  email: string;
  role: SandboxRole;
  roleLabel: string;
  permissions: string[];
}

export async function getSessionContext(): Promise<SessionContext> {
  const session = getSandboxSession();
  if (!session) throw new UnauthenticatedError("Not authenticated");
  return {
    userId: session.id,
    organizationId: session.organizationId,
    departmentId: null,
    memberId: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    roleLabel: session.roleLabel,
    permissions: session.permissions,
  };
}

/**
 * For (erp) route pages: the layout above already redirects unauthenticated
 * visitors to /login, so a page only needs to assert its own permission
 * requirement here — falling back to the dashboard if it's missing.
 */
export async function requirePagePermission(...anyOf: [string, ...string[]]): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!anyOf.some((permission) => session.permissions.includes(permission))) {
    redirect(`/dashboard?denied=${encodeURIComponent(anyOf[0])}`);
  }
  return session;
}
