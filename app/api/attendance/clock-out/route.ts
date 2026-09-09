import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { clockOut } from "../../../../modules/attendance/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "attendance.view");

    const body = (await request.json().catch(() => ({}))) as Partial<{ note: string }>;
    const record = clockOut(session.userId, body.note);

    recordAudit({
      action: "attendance.clock_out",
      entityType: "attendance_record",
      entityId: record.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { clockOut: record.clockOut, durationMinutes: record.durationMinutes },
    });

    return NextResponse.json({ record });
  } catch (error) {
    return handleApiError(error);
  }
}
