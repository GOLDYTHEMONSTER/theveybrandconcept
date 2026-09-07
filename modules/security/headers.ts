import { NextResponse } from "next/server";

export function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  const contentSecurityPolicy = process.env.NODE_ENV === "development"
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none';"
    : "default-src 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'";
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
}
