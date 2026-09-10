import { findMemberByEmail, effectivePermissionsFor, listTeamMembers } from "../team/store";
import type { AuthenticatedUser } from "./domain";
import { ROLE_DEFINITIONS } from "./roles";

const DEMO_PASSWORD = "Demo123!";

export const SANDBOX_DEMO_PASSWORD = DEMO_PASSWORD;

/**
 * A logged-in-capable account is either fully active or still working
 * through onboarding (with a deliberately narrow permission set until it
 * completes -- see effectivePermissionsFor). Offboarding, terminated and
 * suspended are all hard lockouts: access ends the moment an exit starts,
 * not once its paperwork does.
 */
const LOGIN_CAPABLE_STATUSES = ["active", "onboarding"];

/**
 * Every login-capable team member can sign in with the shared sandbox
 * password -- there's no real per-user credential store, so this is what
 * the login page's account picker renders (kept live: a teammate invited
 * from Team > Invite shows up here immediately, in onboarding status).
 */
export function listSandboxLoginAccounts() {
  return listTeamMembers()
    .filter((member) => LOGIN_CAPABLE_STATUSES.includes(member.status))
    .map((member) => ({
      email: member.email,
      name: member.name,
      role: member.role,
      roleLabel: ROLE_DEFINITIONS[member.role].label,
    }));
}

export function authenticateSandboxUser(email: string, password: string): AuthenticatedUser | null {
  if (password !== DEMO_PASSWORD) return null;
  const member = findMemberByEmail(email);
  if (!member || !LOGIN_CAPABLE_STATUSES.includes(member.status)) return null;

  return {
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    roleLabel: ROLE_DEFINITIONS[member.role].label,
    organizationId: "theveybrand-sandbox",
    organizationName: "Veronica Young Brand",
    permissions: effectivePermissionsFor(member),
  };
}
