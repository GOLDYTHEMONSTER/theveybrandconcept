import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMIT_RULES } from "./lib/rate-limit/limiter";

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

  // --- Baseline security headers ---
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // In development, allow unsafe-inline for Next.js dev features
  // In production, tighten this per-app (storefront vs ERP dashboard)
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none';"
    : "default-src 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'";
  response.headers.set("Content-Security-Policy", cspHeader);

  // --- Edge rate limiting for auth routes ---
  const path = request.nextUrl.pathname;
  const ruleKey = AUTH_ROUTE_RULES[path];

  if (ruleKey) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rule = RATE_LIMIT_RULES[ruleKey];
    const result = await checkRateLimit(rule, ip);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
          },
        }
      );
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
