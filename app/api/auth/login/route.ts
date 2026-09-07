import { NextRequest, NextResponse } from "next/server";
import { InvalidCredentialsError, InvalidLoginInputError } from "../../../../modules/authentication/domain";
import { authenticateWithPassword } from "../../../../modules/authentication/service";
import {
  createSandboxSessionToken,
  SANDBOX_SESSION_COOKIE,
  SANDBOX_SESSION_MAX_AGE,
} from "../../../../modules/authentication/session";
import { parseLoginCredentials } from "../../../../modules/authentication/validation";
import { getClientIp, getRequestUserAgent, InvalidRequestOriginError, requireSameOrigin } from "../../../../modules/security/request";
import { recordSandboxSecurityEvent } from "../../../../modules/security/sandbox-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const userAgent = getRequestUserAgent(request);
  let attemptedEmail: string | undefined;
  try {
    requireSameOrigin(request);
    const body = await request.json();
    attemptedEmail = typeof body?.email === "string" ? body.email : undefined;
    const credentials = parseLoginCredentials(body);
    const user = await authenticateWithPassword(credentials);
    const response = NextResponse.json(
      { success: true, user },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(SANDBOX_SESSION_COOKIE, createSandboxSessionToken(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SANDBOX_SESSION_MAX_AGE,
    });
    recordSandboxSecurityEvent({ type: "login.success", actorId: user.id, actorName: user.name, email: user.email, ipAddress, userAgent });
    return response;
  } catch (error) {
    recordSandboxSecurityEvent({ type: "login.failure", email: attemptedEmail, ipAddress, userAgent });
    if (error instanceof InvalidLoginInputError || error instanceof InvalidRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json({ error: "Login service unavailable" }, { status: 500 });
  }
}
