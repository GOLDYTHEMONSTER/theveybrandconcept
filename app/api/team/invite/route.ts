import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { SANDBOX_ROLES, type SandboxRole } from "../../../../modules/authentication/domain";
import { createNotification } from "../../../../modules/notifications/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { ValidationError } from "../../../../modules/shared/errors";
import { inviteTeamMember } from "../../../../modules/team/store";

interface InviteBody {
  name: string;
  email: string;
  role: SandboxRole;
}

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "team.manage");

    const body = (await request.json()) as Partial<InviteBody>;
    if (!body.name?.trim() || !body.email?.trim()) {
      throw new ValidationError("Name and email are required");
    }
    if (!body.role || !SANDBOX_ROLES.includes(body.role)) {
      throw new ValidationError("Select a valid role");
    }

    const member = inviteTeamMember({ name: body.name, email: body.email, role: body.role }, session.userId);

    recordAudit({
      action: "team.invite",
      entityType: "team_member",
      entityId: member.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { name: member.name, email: member.email, role: member.role },
    });

    createNotification({
      audienceRoles: ["executive"],
      type: "team.invited",
      title: "New teammate added",
      message: `${session.name} added ${member.name} as ${member.department}`,
      href: "/team",
    });

    return NextResponse.json({ id: member.id, name: member.name, email: member.email, role: member.role }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
