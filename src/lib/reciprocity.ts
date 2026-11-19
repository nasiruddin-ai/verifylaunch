export const REQUIRED_PEER_TEARDOWNS = 2;

export interface PeerTeardownRecord {
  productId: string;
  productMakerId: string;
  authorId: string;
  status: string;
}

export interface ReciprocityStatus {
  eligible: boolean;
  completedCount: number;
  requiredCount: number;
  remaining: number;
}

/**
 * Pure domain check for the reciprocal quality gate:
 * A maker must contribute at least 2 published verified teardowns on *other*
 * makers' products to claim a free weekly cohort submission slot.
 */
export function evaluateReciprocityEligibility(
  userId: string,
  teardowns: PeerTeardownRecord[],
  requiredCount: number = REQUIRED_PEER_TEARDOWNS
): ReciprocityStatus {
  const distinctPeerProducts = new Set<string>();

  for (const td of teardowns) {
    if (td.authorId !== userId) continue;
    if (td.status !== "PUBLISHED") continue;
    if (td.productMakerId === userId) continue; // Self-teardowns never count
    distinctPeerProducts.add(td.productId);
  }

  const completedCount = distinctPeerProducts.size;
  const remaining = Math.max(0, requiredCount - completedCount);

  return {
    eligible: completedCount >= requiredCount,
    completedCount,
    requiredCount,
    remaining,
  };
}
