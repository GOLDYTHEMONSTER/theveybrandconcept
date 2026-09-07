import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AuthenticatedUser, SandboxSession } from "./domain";

export const SANDBOX_SESSION_COOKIE = "vey-sandbox-session";
export const SANDBOX_SESSION_MAX_AGE = 60 * 60 * 8;

function sessionSecret(): string {
  return process.env.SANDBOX_SESSION_SECRET || "local-development-only-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSandboxSessionToken(user: AuthenticatedUser): string {
  const now = Math.floor(Date.now() / 1000);
  const session: SandboxSession = {
    ...user,
    issuedAt: now,
    expiresAt: now + SANDBOX_SESSION_MAX_AGE,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySandboxSessionToken(token: string | undefined): SandboxSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as SandboxSession;
    if (!session.id || !session.role || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getSandboxSession(): SandboxSession | null {
  return verifySandboxSessionToken(cookies().get(SANDBOX_SESSION_COOKIE)?.value);
}
