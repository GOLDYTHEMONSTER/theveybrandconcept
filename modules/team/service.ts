import { ROLE_DEFINITIONS } from "../authentication/roles";
import { effectivePermissionsFor, listTeamMembers, type TeamMember } from "./store";

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: TeamMember["role"];
  roleLabel: string;
  department: string;
  status: TeamMember["status"];
  permissionCount: number;
  hasOverrides: boolean;
}

export interface TeamMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

export function getTeamRows(): TeamMemberRow[] {
  return listTeamMembers().map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    roleLabel: ROLE_DEFINITIONS[member.role].label,
    department: member.department,
    status: member.status,
    permissionCount: effectivePermissionsFor(member).length,
    hasOverrides: member.overrides.granted.length > 0 || member.overrides.revoked.length > 0,
  }));
}

export function getTeamMetrics(): TeamMetric[] {
  const rows = listTeamMembers();
  const suspended = rows.filter((row) => row.status === "suspended").length;
  const departments = new Set(rows.map((row) => row.department)).size;
  const overridden = rows.filter(
    (row) => row.overrides.granted.length > 0 || row.overrides.revoked.length > 0
  ).length;

  return [
    { label: "Team members", value: String(rows.length), change: `Across ${departments} department${departments === 1 ? "" : "s"}`, tone: "neutral" },
    { label: "Active", value: String(rows.length - suspended), change: "Can sign in today", tone: "positive" },
    { label: "Suspended", value: String(suspended), change: suspended ? "Access revoked" : "None", tone: suspended ? "warning" : "positive" },
    { label: "Custom permissions", value: String(overridden), change: overridden ? "Accounts with overrides" : "All on role defaults", tone: "neutral" },
  ];
}
