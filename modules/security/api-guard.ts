import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, SessionContext, UnauthenticatedError } from "../../lib/auth/session";
import { requireRateLimit, RateLimitExceededError, RATE_LIMIT_RULES } from "../../lib/rate-limit/limiter";
import { getClientIp, InvalidRequestOriginError, requireSameOrigin } from "./request";
import { ConflictError, InsufficientStockError, NotFoundError, ValidationError } from "../shared/errors";

export class ForbiddenError extends Error {
  constructor(public permissionCode: string) {
    super(`Missing permission: ${permissionCode}`);
    this.name = "ForbiddenError";
  }
}

/**
 * Standard guard for every ERP mutation route: same-origin check, session
 * resolution, tenant-aware rate limiting, then a permission assertion.
 * Mirrors the 5-layer pattern documented in app/api/inventory/adjust —
 * routes still run their own mutation + audit steps after this returns.
 */
export async function guardMutation(request: NextRequest, permission: string): Promise<SessionContext> {
  requireSameOrigin(request);
  const session = await getSessionContext();
  await requireRateLimit(RATE_LIMIT_RULES.apiWrite, `${session.userId}:${session.organizationId}`);
  if (!session.permissions.includes(permission)) {
    throw new ForbiddenError(permission);
  }
  return session;
}

export { getClientIp };

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "You do not have permission to do this." }, { status: 403 });
  }
  if (error instanceof InvalidRequestOriginError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof RateLimitExceededError) {
    return NextResponse.json(
      { error: "Too many requests, slow down." },
      { status: 429, headers: { "Retry-After": Math.ceil((error.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ConflictError || error instanceof InsufficientStockError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
