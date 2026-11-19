export interface TeardownSignalInput {
  identityBadgeSnapshot: string; // GITHUB | WORK_EMAIL | MEMBER
  wouldRecommend: string; // YES | WITH_CAVEATS | NOT_YET
  useCaseTested: string;
  strongestFeature: string;
  missingOrFriction: string;
  timeSpentMinutes: number;
  status?: string;
}

export interface ProductRankingInput {
  id: string;
  lastVerifiedActiveAt: Date | string | null;
  bookmarkCount: number;
  uniqueVerifiedTesters: number;
  teardowns: TeardownSignalInput[];
}

export function calculateTeardownWeight(teardown: TeardownSignalInput): number {
  const identityMultiplier =
    teardown.identityBadgeSnapshot === "GITHUB" ||
    teardown.identityBadgeSnapshot === "WORK_EMAIL"
      ? 1.5
      : 1.0;

  const recommendationFactor =
    teardown.wouldRecommend === "YES"
      ? 1.0
      : teardown.wouldRecommend === "WITH_CAVEATS"
      ? 0.85
      : 0.35;

  const totalTextLen =
    teardown.useCaseTested.trim().length +
    teardown.strongestFeature.trim().length +
    teardown.missingOrFriction.trim().length;

  // Reward specific, substantive testing notes up to a modest cap (max +0.25)
  const substanceBonus = totalTextLen >= 220 ? 0.25 : totalTextLen >= 120 ? 0.12 : 0;

  // Modest bonus for deeper test sessions (>= 15 mins)
  const depthBonus = teardown.timeSpentMinutes >= 15 ? 0.1 : 0;

  return Number(
    ((identityMultiplier + substanceBonus + depthBonus) * recommendationFactor).toFixed(3)
  );
}

export function calculateFreshnessMultiplier(
  lastVerifiedActiveAt: Date | string | null,
  now: Date = new Date()
): number {
  if (!lastVerifiedActiveAt) return 0.85;
  const verifiedDate =
    typeof lastVerifiedActiveAt === "string"
      ? new Date(lastVerifiedActiveAt)
      : lastVerifiedActiveAt;
  const ageDays = Math.max(
    0,
    (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (ageDays <= 30) return 1.1; // Verified active within 30 days
  if (ageDays <= 90) return 1.0;
  if (ageDays <= 180) return 0.85;
  return 0.7;
}

export function calculateProductSignalScore(
  product: ProductRankingInput,
  now: Date = new Date()
): number {
  const publishedTeardowns = product.teardowns.filter(
    (t) => !t.status || t.status === "PUBLISHED"
  );

  const teardownScore = publishedTeardowns.reduce(
    (sum, t) => sum + calculateTeardownWeight(t),
    0
  );

  const testerDiversityBonus = 0.25 * Math.log1p(Math.max(0, product.uniqueVerifiedTesters));

  // Bookmarks are strictly capped & low-weight so drive-by upvote rings cannot dominate
  const cappedBookmarkBonus = Math.min(
    0.6,
    0.1 * Math.log1p(Math.max(0, product.bookmarkCount))
  );

  const freshness = calculateFreshnessMultiplier(product.lastVerifiedActiveAt, now);

  return Number(
    ((teardownScore + testerDiversityBonus + cappedBookmarkBonus) * freshness).toFixed(3)
  );
}

export function isCohortRandomized(
  randomizeUntil: Date | string,
  now: Date = new Date()
): boolean {
  const until =
    typeof randomizeUntil === "string" ? new Date(randomizeUntil) : randomizeUntil;
  return now.getTime() < until.getTime();
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle keyed by cohort + viewer session seed
 * for the first 48 hours of a cohort drop.
 */
export function deterministicCohortShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  const rand = mulberry32(hashSeed(seed));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
