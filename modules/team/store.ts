import { randomUUID } from "crypto";
import { SANDBOX_ROLES, type SandboxRole } from "../authentication/domain";
import { getEffectivePermissions, ROLE_DEFINITIONS, type PermissionOverrides } from "../authentication/roles";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";

export type TeamMemberStatus = "active" | "suspended";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: SandboxRole;
  department: string;
  status: TeamMemberStatus;
  overrides: PermissionOverrides;
  createdAt: string;
  updatedAt: string;
}

const DEPARTMENT_BY_ROLE: Record<SandboxRole, string> = {
  executive: "Executive",
  sales_manager: "Sales",
  warehouse_manager: "Operations",
  customer_support: "Customer Service",
  hr_manager: "Human Resources",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEED_MEMBERS: Array<{ id: string; name: string; email: string; role: SandboxRole }> = [
  { id: "sandbox-executive", name: "Veronica Young", email: "executive@theveybrand.com", role: "executive" },
  { id: "sandbox-sales", name: "Amara Okafor", email: "sales@theveybrand.com", role: "sales_manager" },
  { id: "sandbox-warehouse", name: "David Chen", email: "warehouse@theveybrand.com", role: "warehouse_manager" },
  { id: "sandbox-support", name: "Ife Bello", email: "support@theveybrand.com", role: "customer_support" },
  { id: "sandbox-hr", name: "Ngozi Adeyemi", email: "hr@theveybrand.com", role: "hr_manager" },
];

const globalTeam = globalThis as typeof globalThis & { __veyTeam?: TeamMember[] };

function seed(): TeamMember[] {
  const now = new Date().toISOString();
  return SEED_MEMBERS.map((member) => ({
    ...member,
    department: DEPARTMENT_BY_ROLE[member.role],
    status: "active" as const,
    overrides: { granted: [], revoked: [] },
    createdAt: now,
    updatedAt: now,
  }));
}

if (!globalTeam.__veyTeam) {
  globalTeam.__veyTeam = seed();
}

function store(): TeamMember[] {
  return globalTeam.__veyTeam!;
}

export function listTeamMembers(): TeamMember[] {
  return [...store()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getTeamMember(id: string): TeamMember {
  const member = store().find((row) => row.id === id);
  if (!member) throw new NotFoundError("Team member not found");
  return member;
}

export function findMemberByEmail(email: string): TeamMember | null {
  const normalized = email.trim().toLowerCase();
  return store().find((row) => row.email === normalized) ?? null;
}

export function effectivePermissionsFor(member: Pick<TeamMember, "role" | "overrides">): string[] {
  return getEffectivePermissions(member.role, member.overrides);
}

export function inviteTeamMember(
  input: { name: string; email: string; role: SandboxRole },
  actorId: string
): TeamMember {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 120) throw new ValidationError("Name must be 2-120 characters");
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError("A valid email is required");
  if (!SANDBOX_ROLES.includes(input.role)) throw new ValidationError("Select a valid role");
  if (store().some((row) => row.email === email)) throw new ConflictError(`${email} is already on the team`);

  const now = new Date().toISOString();
  const member: TeamMember = {
    id: randomUUID(),
    name,
    email,
    role: input.role,
    department: DEPARTMENT_BY_ROLE[input.role],
    status: "active",
    overrides: { granted: [], revoked: [] },
    createdAt: now,
    updatedAt: now,
  };
  store().push(member);
  void actorId;
  return member;
}

export function updateTeamMemberRole(id: string, role: SandboxRole, actorId: string): TeamMember {
  if (!SANDBOX_ROLES.includes(role)) throw new ValidationError("Select a valid role");
  const member = getTeamMember(id);
  if (member.role === role) return member;

  // Overrides were tuned against the old role's baseline, so they reset on
  // a role change rather than carrying forward permissions that no longer
  // make sense for the new one.
  member.role = role;
  member.department = DEPARTMENT_BY_ROLE[role];
  member.overrides = { granted: [], revoked: [] };
  member.updatedAt = new Date().toISOString();
  void actorId;
  return member;
}

export function setMemberStatus(id: string, status: TeamMemberStatus, actorId: string): TeamMember {
  const member = getTeamMember(id);
  if (status === "suspended") {
    if (member.id === actorId) throw new ValidationError("You cannot suspend your own account");
    const otherActiveExecutives = store().some(
      (row) => row.id !== id && row.role === "executive" && row.status === "active"
    );
    if (member.role === "executive" && !otherActiveExecutives) {
      throw new ValidationError("At least one active executive must remain");
    }
  }
  member.status = status;
  member.updatedAt = new Date().toISOString();
  return member;
}

export function setPermissionOverride(
  id: string,
  permission: string,
  action: "grant" | "revoke" | "reset",
  actorId: string
): TeamMember {
  const member = getTeamMember(id);
  const granted = new Set(member.overrides.granted);
  const revoked = new Set(member.overrides.revoked);
  granted.delete(permission);
  revoked.delete(permission);

  const isBaseGrant = ROLE_DEFINITIONS[member.role].permissions.includes(permission);
  if (action === "grant" && !isBaseGrant) granted.add(permission);
  if (action === "revoke" && isBaseGrant) revoked.add(permission);
  // "reset" just drops any override, returning the permission to its role default.

  member.overrides = { granted: Array.from(granted), revoked: Array.from(revoked) };
  member.updatedAt = new Date().toISOString();
  void actorId;
  return member;
}
