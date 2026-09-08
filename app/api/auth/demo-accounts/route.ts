import { NextResponse } from "next/server";
import { listSandboxLoginAccounts } from "../../../../modules/authentication/sandbox-users";

export const dynamic = "force-dynamic";

/**
 * Public by design: every sandbox account shares one demo password, and
 * the login screen has always advertised the account list openly. This
 * just keeps that list live so a teammate invited from Team > Invite can
 * actually be picked and signed into.
 */
export async function GET() {
  return NextResponse.json({ accounts: listSandboxLoginAccounts() });
}
