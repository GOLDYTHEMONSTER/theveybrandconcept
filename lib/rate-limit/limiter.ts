export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

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

interface Bucket {
  count: number;
  resetAt: number;
}

const sandboxState = globalThis as typeof globalThis & { __veyRateLimits?: Map<string, Bucket> };

export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  const buckets = sandboxState.__veyRateLimits ?? new Map<string, Bucket>();
  sandboxState.__veyRateLimits = buckets;
  const key = `${rule.name}:${identifier}`;
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + rule.windowSeconds * 1000 }
    : existing;

  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export class RateLimitExceededError extends Error {
  constructor(public resetAt: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export async function requireRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const result = await checkRateLimit(rule, identifier);
  if (!result.allowed) throw new RateLimitExceededError(result.resetAt);
}
