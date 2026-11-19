import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  FileText,
  MousePointerClick,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  RECOMMENDATION_LABELS,
  formatStartingPrice,
} from "@/lib/constants";
import { calculateProductSignalScore } from "@/lib/ranking";

export const metadata: Metadata = {
  title: "Maker Conversion Scorecard",
  description:
    "Track qualified outbound clicks, verified tester count, click-to-teardown conversion, and structured buyer objections.",
};

export default async function MakerScorecardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const justSubmitted = sp.submitted === "1";
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="editorial-card p-8">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
            Maker Conversion Scorecard
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-ink">
            Sign in to view your launch conversion metrics
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Instead of celebrating hollow launch-day upvote spikes, your private
            scorecard tracks qualified try-now clicks, verified tester count,
            and structured buyer objections.
          </p>
          <Link
            href="/auth"
            className="mt-5 inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
          >
            Sign in &amp; Verify Identity
          </Link>
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: { makerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      cohort: { select: { slug: true, title: true, status: true } },
      teardowns: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { name: true, verifiedIdentityType: true, workDomain: true },
          },
        },
      },
      visits: {
        select: { id: true, userId: true, sessionHash: true, referrer: true },
      },
      _count: { select: { bookmarks: true, visits: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
            Private Maker Analytics · {user.name}
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Maker Conversion Scorecard
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-secondary">
            Measure what actually converts: qualified outbound try-now clicks,
            verified testers, and concrete objections surfaced during
            evaluations.
          </p>
        </div>
        <Link
          href="/submit"
          className="inline-flex items-center justify-center rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
        >
          Submit Another Product
        </Link>
      </header>

      {justSubmitted && (
        <div className="mt-6 rounded-lg border border-verified-border bg-verified-bg px-4 py-3 text-sm text-verified">
          <strong className="font-semibold">Submission received.</strong> Your
          product passed automated pre-flight checks and is now in the human
          editorial review queue.
        </div>
      )}

      {products.length === 0 ? (
        <div className="mt-8 editorial-card p-10 text-center">
          <h2 className="font-serif text-xl font-medium text-ink">
            No submitted products yet
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Switch to the seeded <strong>Indie Maker</strong> persona in the dev
            bar to inspect HookVault&apos;s live scorecard, or submit your own
            tool on{" "}
            <Link href="/submit" className="font-medium text-ink underline">
              /submit
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {products.map((product) => {
            const totalClicks = product._count.visits;
            const uniqueSessions = new Set(
              product.visits.map((v) => v.userId ?? v.sessionHash)
            ).size;
            const teardownCount = product.teardowns.length;
            const clickToTeardownPct =
              uniqueSessions > 0
                ? Math.round((teardownCount / uniqueSessions) * 100)
                : 0;
            const signalScore = calculateProductSignalScore({
              id: product.id,
              lastVerifiedActiveAt: product.lastVerifiedActiveAt,
              bookmarkCount: product._count.bookmarks,
              uniqueVerifiedTesters: new Set(
                product.teardowns.map((t) => t.authorId)
              ).size,
              teardowns: product.teardowns,
            });

            return (
              <section key={product.id} className="editorial-card p-6">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-medium text-ink">
                        {product.name}
                      </h2>
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${
                          product.status === "LIVE"
                            ? "border-verified-border bg-verified-bg text-verified"
                            : product.status === "REJECTED"
                            ? "border-danger-border bg-danger-bg text-danger"
                            : "border-caution-border bg-caution-bg text-caution"
                        }`}
                      >
                        {product.status}
                      </span>
                      <span className="font-mono text-xs text-ink-muted">
                        {CATEGORY_LABELS[product.category]} ·{" "}
                        {formatStartingPrice(product.startingPriceUsd)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {product.cohort
                        ? `Assigned to ${product.cohort.title}`
                        : "Awaiting cohort assignment from editorial queue"}
                    </p>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                  >
                    <span>View Public Dossier</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {product.editorNotes && (
                  <div className="mt-4 rounded-md border border-border bg-surface-subtle px-4 py-3 text-xs text-ink-secondary">
                    <span className="font-mono font-semibold uppercase text-ink">
                      Editorial Note:{" "}
                    </span>
                    {product.editorNotes}
                  </div>
                )}

                {/* Funnel Metrics Strip */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-lg border border-border bg-canvas p-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      <span>Qualified Clicks</span>
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-ink tabular">
                      {totalClicks}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                      <Users className="h-3.5 w-3.5" />
                      <span>Unique Evaluators</span>
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-ink tabular">
                      {uniqueSessions}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                      <FileText className="h-3.5 w-3.5 text-verified" />
                      <span>Verified Teardowns</span>
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-verified tabular">
                      {teardownCount}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Test → Review</span>
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-ink tabular">
                      {clickToTeardownPct}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Shortlists / Signal</span>
                    </div>
                    <div className="mt-1 font-mono text-lg font-semibold text-ink tabular">
                      {product._count.bookmarks}{" "}
                      <span className="text-xs font-normal text-ink-muted">
                        ({signalScore.toFixed(1)} pts)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Synthesized Buyer Objections & Friction */}
                <div className="mt-5">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-caution">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      Buyer Friction &amp; Objections ({product.teardowns.length})
                    </span>
                  </div>

                  {product.teardowns.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-muted">
                      Once verified buyers click through and publish teardowns,
                      their concrete objections and gaps will be synthesized
                      here.
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-2">
                      {product.teardowns.map((td) => (
                        <li
                          key={td.id}
                          className="rounded-md border border-caution-border/70 bg-caution-bg/50 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-ink-muted">
                            <span>
                              {td.author.name}
                              {td.author.workDomain
                                ? ` (${td.author.workDomain})`
                                : ""}
                            </span>
                            <span className="font-medium text-ink">
                              {RECOMMENDATION_LABELS[td.wouldRecommend]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink">
                            {td.missingOrFriction}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
