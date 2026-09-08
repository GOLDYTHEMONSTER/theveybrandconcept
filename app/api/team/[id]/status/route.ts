import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";
import { getTeamMember, setMemberStatus, type TeamMemberStatus } from "../../../../../modules/team/store";

const VALID_STATUSES: TeamMemberStatus[] = ["active", "suspended"];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "team.manage");

    const body = (await request.json()) as Partial<{ status: TeamMemberStatus }>;
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      throw new ValidationError("Status must be active or suspended");
    }

    const before = getTeamMember(params.id);
    const member = setMemberStatus(params.id, body.status, session.userId);

    recordAudit({
      action: "team.status_change",
      entityType: "team_member",
      entityId: member.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: member.status },
    });

    return NextResponse.json({ id: member.id, status: member.status });
  } catch (error) {
    return handleApiError(error);
  }
}
