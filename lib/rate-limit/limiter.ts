/**
 * Rate limiting, applied uniformly across request types:
 *   - auth (login, signup, password reset)
 *   - ERP API routes (mutations especially)
 *   - storefront cart/checkout
 *   - search / export endpoints
 *
 * Primary path: Upstash Redis REST API (serverless-friendly, free tier,
 * works on Vercel Edge and Node runtimes without provisioning infra —
 * consistent with the "no dedicated Redis server for v1" budget decision).
 *
 * Fallback path: Postgres `rate_limit_events` table (see migration 0001)
 * via the service-role client, used automatically if Upstash env vars
 * are not configured. Slower and not ideal at high volume, but keeps
 * every request rate-limited from day one even before Upstash is wired
 * up — "ship without rate limiting" is not an acceptable fallback.
 */

import { createServiceRoleSupabase } from "../supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

export interface RateLimitRule {
  /** Logical bucket name, e.g. "login", "api:inventory:write", "checkout" */
  name: string;
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

// Sensible defaults per request type. Override per-route as needed.
export const RATE_LIMIT_RULES = {
  authLogin: { name: "auth:login", limit: 5, windowSeconds: 60 } as RateLimitRule,
  authSignup: { name: "auth:signup", limit: 3, windowSeconds: 300 } as RateLimitRule,
  authPasswordReset: { name: "auth:password_reset", limit: 3, windowSeconds: 300 } as RateLimitRule,
  apiRead: { name: "api:read", limit: 120, windowSeconds: 60 } as RateLimitRule,
  apiWrite: { name: "api:write", limit: 30, windowSeconds: 60 } as RateLimitRule,
  apiExport: { name: "api:export", limit: 5, windowSeconds: 300 } as RateLimitRule,
  checkout: { name: "storefront:checkout", limit: 10, windowSeconds: 60 } as RateLimitRule,
  search: { name: "storefront:search", limit: 60, windowSeconds: 60 } as RateLimitRule,
} as const;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * `identifier` should uniquely scope the caller: IP for anonymous
 * traffic (auth, public storefront), `userId:organizationId` for
 * authenticated ERP calls so one tenant can't exhaust another's quota.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  const bucketKey = `${rule.name}:${identifier}`;

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return checkWithUpstash(rule, bucketKey);
  }
  return checkWithPostgres(rule, bucketKey);
}

async function checkWithUpstash(rule: RateLimitRule, bucketKey: string): Promise<RateLimitResult> {
  // Fixed-window counter via Upstash's REST pipeline: INCR then, on the
  // first hit in the window, set an expiry equal to the window length.
  const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(bucketKey)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const { result: count } = (await incrRes.json()) as { result: number };

  if (count === 1) {
    await fetch(
      `${UPSTASH_URL}/expire/${encodeURIComponent(bucketKey)}/${rule.windowSeconds}`,
      { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
    );
  }

  const ttlRes = await fetch(`${UPSTASH_URL}/ttl/${encodeURIComponent(bucketKey)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const { result: ttlSeconds } = (await ttlRes.json()) as { result: number };

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt: Date.now() + Math.max(0, ttlSeconds) * 1000,
  };
}

async function checkWithPostgres(rule: RateLimitRule, bucketKey: string): Promise<RateLimitResult> {
  const supabase = createServiceRoleSupabase();
  const windowStart = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("bucket_key", bucketKey)
    .gte("created_at", windowStart);

  if (countError) {
    // Fail closed on read errors for auth-sensitive buckets, fail open
    // otherwise, so a rate-limit outage can't become a full outage for
    // ordinary read traffic. Adjust per your risk tolerance.
    console.error("[rate-limit] postgres check failed", countError);
    return { allowed: true, remaining: 0, resetAt: Date.now() + rule.windowSeconds * 1000 };
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < rule.limit;

  if (allowed) {
    await supabase.from("rate_limit_events").insert({ bucket_key: bucketKey });
  }

  return {
    allowed,
    remaining: Math.max(0, rule.limit - currentCount - 1),
    resetAt: Date.now() + rule.windowSeconds * 1000,
  };
}

/** Thrown by requireRateLimit() so route handlers can catch it -> 429 */
export class RateLimitExceededError extends Error {
  constructor(public resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export async function requireRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const result = await checkRateLimit(rule, identifier);
  if (!result.allowed) {
    throw new RateLimitExceededError(result.resetAt);
  }
}
