import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { isLateClockIn } from "../../../../modules/attendance/service";
import { clockIn } from "../../../../modules/attendance/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { createNotification } from "../../../../modules/notifications/store";

const ATTENDANCE_AUDIENCE = ["executive", "hr_manager"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "attendance.view");

    const record = clockIn(session.userId);
    const isLate = isLateClockIn(record.clockIn);

    recordAudit({
      action: "attendance.clock_in",
      entityType: "attendance_record",
      entityId: record.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { clockIn: record.clockIn, late: isLate },
    });

    if (!ATTENDANCE_AUDIENCE.includes(session.role as (typeof ATTENDANCE_AUDIENCE)[number])) {
      if (isLate) {
        createNotification({
          audienceRoles: [...ATTENDANCE_AUDIENCE],
          type: "attendance.late",
          title: "Late clock-in",
          message: `${session.name} clocked in late, at ${new Date(record.clockIn).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`,
          href: "/attendance",
        });
      } else {
        createNotification({
          audienceRoles: [...ATTENDANCE_AUDIENCE],
          type: "attendance.clock_in",
          title: "Clock-in recorded",
          message: `${session.name} clocked in.`,
          href: "/attendance",
        });
      }
    }

    return NextResponse.json({ record });
  } catch (error) {
    return handleApiError(error);
  }
}
