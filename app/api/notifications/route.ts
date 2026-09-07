import { NextResponse } from "next/server";
import { getSessionContext, UnauthenticatedError } from "../../../lib/auth/session";
import { getUnreadCount, listNotificationsForUser } from "../../../modules/notifications/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionContext();
    const notifications = listNotificationsForUser(session.role, session.userId, 30);
    const unreadCount = getUnreadCount(session.role, session.userId);
    return NextResponse.json({ notifications, unreadCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    throw error;
  }
}
