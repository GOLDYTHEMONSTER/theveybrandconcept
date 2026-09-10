import { createHash } from "crypto";

/**
 * Deterministic id for seed data. Vercel can route requests for the same
 * record to different serverless instances, and each one re-runs a
 * module's seed function fresh -- randomUUID() there means every instance
 * invents a different id for the same "47th seeded order", so a link
 * built from one instance's id 404s the moment a follow-up request (the
 * detail page, an action on it) lands on another instance. Seed ids must
 * be a pure function of the record's own position/data, never randomness.
 * Live, user-created records still get a real random id -- only seed-time
 * generation needs this. (Mirrors modules/catalog/store.ts's stableId,
 * which solved this same problem for the product catalog.)
 */
export function stableId(seed: string): string {
  const hex = createHash("sha1").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Same determinism requirement for opaque tokens (recovery links, shipment tracking tokens, etc.) handed out in seed data. */
export function stableToken(seed: string, length = 32): string {
  return createHash("sha1").update(seed).digest("hex").slice(0, length);
}

/**
 * A seeded PRNG (mulberry32) so a seed function's random-ish choices
 * (which customer, which status, which date) come out byte-identical on
 * every cold start -- not just the ids. Two instances that disagree on
 * whether order #47 is "delivered" or "cancelled" would be a subtler bug
 * than a 404: the same link would silently show different data depending
 * on which instance answered.
 */
export function createSeededRandom(seed: string): () => number {
  let state = parseInt(createHash("sha1").update(seed).digest("hex").slice(0, 8), 16) || 1;
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
