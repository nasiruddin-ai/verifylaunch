import { describe, expect, it } from "vitest";
import {
  calculateFreshnessMultiplier,
  calculateProductSignalScore,
  calculateTeardownWeight,
  deterministicCohortShuffle,
  isCohortRandomized,
} from "@/lib/ranking";

describe("Verified Signal Ranking Engine", () => {
  it("weights verified GitHub/Work Email teardowns 1.5x higher than unverified members", () => {
    const base = {
      wouldRecommend: "YES",
      useCaseTested: "Tested PostgreSQL backup restore on a 4GB staging database.",
      strongestFeature: "Zero-config point-in-time recovery with CLI verification.",
      missingOrFriction: "Needs S3-compatible custom endpoint documentation.",
      timeSpentMinutes: 20,
    };

    const verifiedWeight = calculateTeardownWeight({
      ...base,
      identityBadgeSnapshot: "GITHUB",
    });
    const unverifiedWeight = calculateTeardownWeight({
      ...base,
      identityBadgeSnapshot: "MEMBER",
    });

    expect(verifiedWeight).toBeGreaterThan(unverifiedWeight);
    expect(verifiedWeight - unverifiedWeight).toBeCloseTo(0.5, 2);
  });

  it("caps bookmark weight so drive-by upvote rings cannot beat real verified teardowns", () => {
    const now = new Date("2026-11-18T12:00:00Z");

    const hypedProduct = calculateProductSignalScore(
      {
        id: "hyped",
        lastVerifiedActiveAt: now,
        bookmarkCount: 5000,
        uniqueVerifiedTesters: 0,
        teardowns: [],
      },
      now
    );

    const verifiedProduct = calculateProductSignalScore(
      {
        id: "verified",
        lastVerifiedActiveAt: now,
        bookmarkCount: 2,
        uniqueVerifiedTesters: 2,
        teardowns: [
          {
            identityBadgeSnapshot: "WORK_EMAIL",
            wouldRecommend: "YES",
            useCaseTested: "Migrated 12 Stripe webhooks and tested replay alerts.",
            strongestFeature: "Instant signature inspection and dead-letter replay.",
            missingOrFriction: "Webhook retention on starter tier is only 14 days.",
            timeSpentMinutes: 25,
          },
        ],
      },
      now
    );

    expect(verifiedProduct).toBeGreaterThan(hypedProduct * 2);
  });

  it("rewards 30-day verified freshness and decays stale products", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const fresh = calculateFreshnessMultiplier(new Date("2026-11-10T12:00:00Z"), now);
    const aging = calculateFreshnessMultiplier(new Date("2026-09-15T12:00:00Z"), now);
    const stale = calculateFreshnessMultiplier(new Date("2026-01-01T12:00:00Z"), now);

    expect(fresh).toBeGreaterThan(aging);
    expect(aging).toBeGreaterThan(stale);
  });

  it("detects 48h cohort randomization window and shuffles deterministically per seed", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(isCohortRandomized("2026-11-19T12:00:00Z", now)).toBe(true);
    expect(isCohortRandomized("2026-11-17T12:00:00Z", now)).toBe(false);

    const items = ["a", "b", "c", "d", "e", "f"];
    const first = deterministicCohortShuffle(items, "cohort-w47:viewer-1");
    const second = deterministicCohortShuffle(items, "cohort-w47:viewer-1");
    const differentViewer = deterministicCohortShuffle(items, "cohort-w47:viewer-2");

    expect(first).toEqual(second);
    expect(first.sort()).toEqual([...items].sort());
    expect(differentViewer).not.toEqual(first);
  });
});
