import { NextResponse } from "next/server";
import { getSandboxSession } from "../../../../modules/authentication/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSandboxSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { issuedAt: _issuedAt, expiresAt: _expiresAt, ...user } = session;
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
