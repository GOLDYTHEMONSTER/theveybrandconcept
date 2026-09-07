import { NextRequest, NextResponse } from "next/server";
import { getSandboxSession, SANDBOX_SESSION_COOKIE } from "../../../../modules/authentication/session";
import { getClientIp, getRequestUserAgent, InvalidRequestOriginError, requireSameOrigin } from "../../../../modules/security/request";
import { recordSandboxSecurityEvent } from "../../../../modules/security/sandbox-events";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const session = getSandboxSession();
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SANDBOX_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    recordSandboxSecurityEvent({
      type: "logout",
      actorId: session?.id,
      actorName: session?.name,
      email: session?.email,
      ipAddress: getClientIp(request),
      userAgent: getRequestUserAgent(request),
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
