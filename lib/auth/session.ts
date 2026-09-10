import { redirect } from "next/navigation";
import { getSandboxSession } from "../../modules/authentication/session";
import type { SandboxRole } from "../../modules/authentication/domain";
import { getTeamMember } from "../../modules/team/store";

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

const LOCKED_OUT_STATUSES = ["offboarding", "terminated", "suspended"];

export async function getSessionContext(): Promise<SessionContext> {
  const session = getSandboxSession();
  if (!session) throw new UnauthenticatedError("Not authenticated");

  // The session cookie is a signature-verified snapshot from login, not a
  // live record -- correct for permission changes (those intentionally
  // apply next login, per Team's own sandbox-note), wrong for a security
  // cutoff. Offboarding a teammate has to end their *current* session
  // immediately, not just block their next login attempt, or "access
  // revoked" would be a lie for up to SANDBOX_SESSION_MAX_AGE. This is the
  // one thing this function checks live instead of trusting the token.
  let member;
  try {
    member = getTeamMember(session.id);
  } catch {
    throw new UnauthenticatedError("Account no longer exists");
  }
  if (LOCKED_OUT_STATUSES.includes(member.status)) {
    throw new UnauthenticatedError("Access has been revoked");
  }

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
