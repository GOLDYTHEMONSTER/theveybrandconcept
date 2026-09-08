import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { SANDBOX_ROLES, type SandboxRole } from "../../../../../modules/authentication/domain";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";
import { getTeamMember, updateTeamMemberRole } from "../../../../../modules/team/store";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "team.manage");

    const body = (await request.json()) as Partial<{ role: SandboxRole }>;
    if (!body.role || !SANDBOX_ROLES.includes(body.role)) {
      throw new ValidationError("Select a valid role");
    }

    const before = getTeamMember(params.id);
    const member = updateTeamMemberRole(params.id, body.role, session.userId);

    recordAudit({
      action: "team.role_change",
      entityType: "team_member",
      entityId: member.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { role: before.role },
      afterValue: { role: member.role },
    });

    return NextResponse.json({ id: member.id, role: member.role, department: member.department });
  } catch (error) {
    return handleApiError(error);
  }
}
