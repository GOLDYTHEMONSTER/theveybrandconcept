import { NextRequest } from "next/server";

export class InvalidRequestOriginError extends Error {
  constructor() {
    super("Invalid request origin");
    this.name = "InvalidRequestOriginError";
  }
}

export function getClientIp(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || null;
}

export function getRequestUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent")?.slice(0, 512) || null;
}

export function requireSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new InvalidRequestOriginError();
  }

  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!expectedHost || originHost !== expectedHost) throw new InvalidRequestOriginError();
}
