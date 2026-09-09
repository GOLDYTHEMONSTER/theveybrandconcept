import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { clockIn } from "../../../../modules/attendance/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { createNotification } from "../../../../modules/notifications/store";

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "attendance.view");

    const record = clockIn(session.userId);

    recordAudit({
      action: "attendance.clock_in",
      entityType: "attendance_record",
      entityId: record.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { clockIn: record.clockIn },
    });

    if (session.role !== "executive") {
      createNotification({
        audienceRoles: ["executive"],
        type: "attendance.clock_in",
        title: "Clock-in recorded",
        message: `${session.name} clocked in.`,
        href: "/attendance",
      });
    }

    return NextResponse.json({ record });
  } catch (error) {
    return handleApiError(error);
  }
}
