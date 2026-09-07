import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMIT_RULES } from "./lib/rate-limit/limiter";
import { applySecurityHeaders } from "./modules/security/headers";

/**
 * Runs on every request. Two jobs:
 *   1. Attach baseline security headers to every response.
 *   2. Rate-limit auth endpoints at the edge, before they ever reach
 *      Supabase Auth — this is where brute-force login / signup-spam
 *      protection actually needs to live, ahead of the app layer.
 *
 * This does NOT replace per-route rate limiting inside API handlers
 * (see lib/rate-limit/limiter.ts) — ERP write endpoints and storefront
 * checkout call requireRateLimit() themselves with tighter, tenant-aware
 * buckets. Middleware only covers the anonymous, IP-scoped auth surface.
 */

const AUTH_ROUTE_RULES: Record<string, keyof typeof RATE_LIMIT_RULES> = {
  "/api/auth/login": "authLogin",
  "/auth/login": "authLogin",
  "/api/auth/signup": "authSignup",
  "/auth/signup": "authSignup",
  "/api/auth/reset-password": "authPasswordReset",
  "/auth/reset-password": "authPasswordReset",
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  applySecurityHeaders(response);

  // --- Edge rate limiting for auth routes ---
  const path = request.nextUrl.pathname;
  const ruleKey = AUTH_ROUTE_RULES[path];

  if (ruleKey) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rule = RATE_LIMIT_RULES[ruleKey];
    const result = await checkRateLimit(rule, ip);

    if (!result.allowed) {
      const blockedResponse = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
          },
        }
      );
      applySecurityHeaders(blockedResponse);
      return blockedResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets, so headers apply broadly,
     * while rate limiting only actually triggers on the auth paths above.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
