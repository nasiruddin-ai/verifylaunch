import { describe, expect, it } from "vitest";
import { evaluateReciprocityEligibility } from "@/lib/reciprocity";

describe("Reciprocal Peer Teardown Gate", () => {
  it("requires 2 distinct published teardowns on other makers' products", () => {
    const makerId = "user-maker";

    const locked = evaluateReciprocityEligibility(makerId, [
      {
        productId: "prod-1",
        productMakerId: "other-1",
        authorId: makerId,
        status: "PUBLISHED",
      },
      // Self-review must not count
      {
        productId: "prod-own",
        productMakerId: makerId,
        authorId: makerId,
        status: "PUBLISHED",
      },
      // Flagged/hidden review must not count
      {
        productId: "prod-2",
        productMakerId: "other-2",
        authorId: makerId,
        status: "HIDDEN",
      },
    ]);

    expect(locked.eligible).toBe(false);
    expect(locked.completedCount).toBe(1);
    expect(locked.remaining).toBe(1);

    const unlocked = evaluateReciprocityEligibility(makerId, [
      {
        productId: "prod-1",
        productMakerId: "other-1",
        authorId: makerId,
        status: "PUBLISHED",
      },
      {
        productId: "prod-3",
        productMakerId: "other-3",
        authorId: makerId,
        status: "PUBLISHED",
      },
    ]);

    expect(unlocked.eligible).toBe(true);
    expect(unlocked.completedCount).toBe(2);
    expect(unlocked.remaining).toBe(0);
  });
});
