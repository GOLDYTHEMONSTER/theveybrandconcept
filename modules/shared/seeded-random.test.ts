import { describe, expect, it } from "vitest";
import { createSeededRandom, stableId, stableToken } from "./seeded-random";

/**
 * These three functions exist for one reason: on Vercel, every serverless
 * instance re-runs a module's seed function on cold start. If that seed
 * used randomUUID() or Math.random(), instance A's "order #47" and
 * instance B's "order #47" would get different ids/content, and a link
 * built from one instance's response would 404 on the next. These tests
 * are the regression guard for that exact bug -- see the comment in
 * modules/catalog/store.ts (stableId) and modules/shared/seeded-random.ts
 * for the full story.
 */
describe("stableId", () => {
  it("is a pure function of its seed -- same input, same output, every call", () => {
    expect(stableId("order-seed-47")).toBe(stableId("order-seed-47"));
  });

  it("produces different ids for different seeds", () => {
    expect(stableId("order-seed-1")).not.toBe(stableId("order-seed-2"));
  });

  it("shapes like a UUID (8-4-4-4-12 hex)", () => {
    expect(stableId("anything")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("stableToken", () => {
  it("is deterministic and respects the requested length", () => {
    expect(stableToken("order-recovery-3")).toBe(stableToken("order-recovery-3"));
    expect(stableToken("shipment-public-3", 16)).toHaveLength(16);
  });
});

describe("createSeededRandom", () => {
  it("two generators built from the same seed produce the identical sequence", () => {
    const a = createSeededRandom("theveybrand-orders-seed-v1");
    const b = createSeededRandom("theveybrand-orders-seed-v1");
    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("different seeds diverge", () => {
    const a = createSeededRandom("seed-a");
    const b = createSeededRandom("seed-b");
    expect(a()).not.toBe(b());
  });

  it("stays within [0, 1)", () => {
    const rand = createSeededRandom("range-check");
    for (let i = 0; i < 200; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
