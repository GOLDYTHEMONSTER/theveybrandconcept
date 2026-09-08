import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { ALL_PERMISSIONS } from "../../../../../modules/authentication/roles";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";
import { effectivePermissionsFor, getTeamMember, setPermissionOverride } from "../../../../../modules/team/store";

type OverrideAction = "grant" | "revoke" | "reset";
const VALID_ACTIONS: OverrideAction[] = ["grant", "revoke", "reset"];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "team.manage");

    const body = (await request.json()) as Partial<{ permission: string; action: OverrideAction }>;
    if (!body.permission || !ALL_PERMISSIONS.includes(body.permission)) {
      throw new ValidationError("Unknown permission");
    }
    if (!body.action || !VALID_ACTIONS.includes(body.action)) {
      throw new ValidationError("Action must be grant, revoke, or reset");
    }

    const before = getTeamMember(params.id);
    const beforePermissions = effectivePermissionsFor(before);
    const member = setPermissionOverride(params.id, body.permission, body.action, session.userId);
    const afterPermissions = effectivePermissionsFor(member);

    recordAudit({
      action: "team.permission_override",
      entityType: "team_member",
      entityId: member.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { permission: body.permission, hadIt: beforePermissions.includes(body.permission) },
      afterValue: { permission: body.permission, hasIt: afterPermissions.includes(body.permission), action: body.action },
    });

    return NextResponse.json({ id: member.id, permissions: afterPermissions, overrides: member.overrides });
  } catch (error) {
    return handleApiError(error);
  }
}
