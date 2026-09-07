import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, UnauthenticatedError } from "../../../../../lib/auth/session";
import { requireSameOrigin, InvalidRequestOriginError } from "../../../../../modules/security/request";
import { markNotificationRead } from "../../../../../modules/notifications/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireSameOrigin(request);
    const session = await getSessionContext();
    markNotificationRead(params.id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof InvalidRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
