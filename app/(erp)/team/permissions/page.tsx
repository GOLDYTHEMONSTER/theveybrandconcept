import { requirePagePermission } from "../../../../lib/auth/session";
import { PERMISSION_CATALOG, ROLE_DEFINITIONS } from "../../../../modules/authentication/roles";
import { effectivePermissionsFor, listTeamMembers } from "../../../../modules/team/store";
import PermissionsManager from "../../_components/PermissionsManager";

export const dynamic = "force-dynamic";

export default async function TeamPermissionsPage() {
  await requirePagePermission("team.manage");

  const members = listTeamMembers().map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    roleLabel: ROLE_DEFINITIONS[member.role].label,
    status: member.status,
    effective: effectivePermissionsFor(member),
  }));

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Team · Permissions</p>
          <h1>Access, by account.</h1>
          <p>
            Every account starts with its role&apos;s default permissions. Toggle a box here to grant or revoke one
            permission for that account specifically, without touching anyone else on the same role.
          </p>
        </div>
      </section>

      <PermissionsManager members={members} catalog={PERMISSION_CATALOG} />

      <p className="sandbox-note">
        <span>●</span> Changes apply the next time that teammate signs in — sandbox sessions carry their permissions
        from login, not live.
      </p>
    </>
  );
}
