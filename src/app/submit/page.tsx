import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  evaluateReciprocityEligibility,
  REQUIRED_PEER_TEARDOWNS,
} from "@/lib/reciprocity";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Submit a Live Product",
  description:
    "Pass the automated anti-slop pre-flight gate and reciprocal peer teardown check to enter the next VerifyLaunch weekly drop.",
};

export default async function SubmitPage() {
  const user = await getCurrentUser();

  let reciprocity = {
    eligible: false,
    completedCount: 0,
    requiredCount: REQUIRED_PEER_TEARDOWNS,
    remaining: REQUIRED_PEER_TEARDOWNS,
  };

  let suggestedProducts: Array<{
    slug: string;
    name: string;
    tagline: string;
  }> = [];

  if (user) {
    const [authored, livePeers] = await Promise.all([
      prisma.teardown.findMany({
        where: { authorId: user.id },
        select: {
          productId: true,
          authorId: true,
          status: true,
          product: { select: { makerId: true } },
        },
      }),
      prisma.product.findMany({
        where: {
          status: "LIVE",
          makerId: { not: user.id },
        },
        orderBy: { launchedAt: "desc" },
        take: 6,
        select: { id: true, slug: true, name: true, tagline: true },
      }),
    ]);

    reciprocity = evaluateReciprocityEligibility(
      user.id,
      authored.map((t) => ({
        productId: t.productId,
        productMakerId: t.product.makerId,
        authorId: t.authorId,
        status: t.status,
      }))
    );

    const reviewedIds = new Set(authored.map((a) => a.productId));
    suggestedProducts = livePeers
      .filter((p) => !reviewedIds.has(p.id))
      .slice(0, 3)
      .map(({ slug, name, tagline }) => ({ slug, name, tagline }));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
          Anti-Slop Submission Gate
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Submit a Live Product
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          We cap weekly cohorts at 8 vetted B2B &amp; developer tools. No
          waitlists, no hidden &ldquo;book a demo&rdquo; pricing, and zero
          pay-to-rank shortcuts.
        </p>
      </header>

      <SubmitForm
        signedIn={Boolean(user)}
        isEditor={user?.role === "EDITOR"}
        reciprocity={reciprocity}
        suggestedProducts={suggestedProducts}
      />
    </div>
  );
}
