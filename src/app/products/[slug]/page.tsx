import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser, getIdentityBadgeLabel } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  FUNDING_LABELS,
  PRICING_LABELS,
  RECOMMENDATION_LABELS,
  REVENUE_LABELS,
  formatRelativeDays,
  formatStartingPrice,
} from "@/lib/constants";
import { parsePreflightReport } from "@/lib/preflight";
import { calculateProductSignalScore } from "@/lib/ranking";
import { BookmarkButton } from "@/components/BookmarkButton";
import { TeardownComposer } from "@/components/TeardownComposer";

export default async function ProductDossierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      maker: {
        select: {
          id: true,
          name: true,
          handle: true,
          verifiedIdentityType: true,
          githubUsername: true,
          workDomain: true,
          bio: true,
        },
      },
      cohort: {
        select: { id: true, slug: true, title: true, status: true },
      },
      teardowns: {
        where: { status: "PUBLISHED" },
        orderBy: [{ qualityWeight: "desc" }, { createdAt: "desc" }],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              handle: true,
              verifiedIdentityType: true,
              githubUsername: true,
              workDomain: true,
            },
          },
        },
      },
      _count: {
        select: { bookmarks: true, visits: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Only maker or editor can view non-live submissions
  if (
    product.status !== "LIVE" &&
    user?.id !== product.makerId &&
    user?.role !== "EDITOR"
  ) {
    notFound();
  }

  const [bookmarkRecord, verifiedVisitRecord] = user
    ? await Promise.all([
        prisma.bookmark.findUnique({
          where: {
            userId_productId: { userId: user.id, productId: product.id },
          },
        }),
        prisma.productVisit.findFirst({
          where: {
            productId: product.id,
            userId: user.id,
            clickedTryNow: true,
          },
        }),
      ])
    : [null, null];

  const preflight = parsePreflightReport(product.preflightReportJson);
  const uniqueTesters = new Set(product.teardowns.map((t) => t.authorId)).size;
  const signalScore = calculateProductSignalScore({
    id: product.id,
    lastVerifiedActiveAt: product.lastVerifiedActiveAt,
    bookmarkCount: product._count.bookmarks,
    uniqueVerifiedTesters: uniqueTesters,
    teardowns: product.teardowns,
  });

  const alreadyReviewed = Boolean(
    user && product.teardowns.some((t) => t.authorId === user.id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={product.cohort ? (product.cohort.status === "ACTIVE" ? "/" : `/cohorts/${product.cohort.slug}`) : "/directory"}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            {product.cohort ? product.cohort.title : "Back to Verified Directory"}
          </span>
        </Link>
        {product.status !== "LIVE" && (
          <span className="rounded border border-caution-border bg-caution-bg px-2.5 py-0.5 font-mono text-xs font-medium text-caution">
            Status: {product.status}
          </span>
        )}
      </div>

      {/* Product Header */}
      <header className="mt-5 editorial-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-subtle font-mono text-lg font-semibold text-ink">
              {product.logoMark}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-border bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-ink-secondary">
                  {CATEGORY_LABELS[product.category] ?? product.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-verified-border bg-verified-bg px-2 py-0.5 font-mono text-[11px] font-medium text-verified">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{formatRelativeDays(product.lastVerifiedActiveAt)}</span>
                </span>
                {product.domainVerified && (
                  <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-secondary">
                    Domain Verified
                  </span>
                )}
              </div>

              <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-ink-secondary">
                {product.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            <BookmarkButton
              slug={product.slug}
              initialBookmarked={Boolean(bookmarkRecord)}
              initialCount={product._count.bookmarks}
              signedIn={Boolean(user)}
            />
            <a
              href={product.pricingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-xs font-medium text-ink hover:border-ink"
            >
              <span>Pricing Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              id="dossier-open-test-btn"
              href={`/go/${product.slug}?ref=dossier`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
            >
              <span>Open &amp; Test Product</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Standardized Buyer Fact Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-5">
          <div>
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Starting Price
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-ink tabular">
              {formatStartingPrice(product.startingPriceUsd)}
            </div>
            <div className="text-[11px] text-ink-muted">
              {PRICING_LABELS[product.pricingModel] ?? product.pricingModel}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Trial Friction
            </div>
            <div className="mt-0.5 text-sm font-medium text-ink">
              {product.noCreditCardTrial ? "No credit card" : "Card upfront"}
            </div>
            <div className="text-[11px] text-ink-muted">Self-serve live app</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Lock-in / Hosting
            </div>
            <div className="mt-0.5 text-sm font-medium text-ink">
              {product.selfHostable ? "Self-hostable" : "Managed cloud"}
            </div>
            <div className="text-[11px] text-ink-muted">
              {product.dataExportable ? "Full data export" : "Limited export"}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Funding &amp; Traction
            </div>
            <div className="mt-0.5 text-sm font-medium text-ink">
              {FUNDING_LABELS[product.fundingStage] ?? product.fundingStage}
            </div>
            <div className="text-[11px] text-ink-muted">
              {REVENUE_LABELS[product.revenueBand] ?? product.revenueBand}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Verified Signal
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-verified tabular">
              {signalScore.toFixed(2)} pts
            </div>
            <div className="text-[11px] text-ink-muted tabular">
              {product.teardowns.length} teardowns · {product._count.visits} tests
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Overview & Explicit Anti-Hype "Not For Whom" */}
          <section className="editorial-card p-6">
            <h2 className="font-serif text-xl font-medium text-ink">
              What it actually does
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">
              {product.description}
            </p>

            <div className="mt-5 rounded-lg border border-caution-border bg-caution-bg p-4">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wide text-caution">
                <AlertTriangle className="h-4 w-4" />
                <span>Who this is NOT for (Mandatory Maker Disclosure)</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                {product.notForWhom}
              </p>
            </div>

            {product.demoVideoUrl && (
              <div className="mt-5 rounded-lg border border-border bg-surface-subtle p-4">
                <div className="font-mono text-xs font-medium text-ink">
                  60-Second Unedited Walkthrough
                </div>
                <a
                  href={product.demoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-verified hover:underline"
                >
                  <span>Watch walkthrough link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </section>

          {/* Click-Before-Teardown Composer */}
          {product.status === "LIVE" && (
            <section id="write-teardown">
              <TeardownComposer
                slug={product.slug}
                productName={product.name}
                signedIn={Boolean(user)}
                isMaker={user?.id === product.makerId}
                hasVerifiedVisit={Boolean(verifiedVisitRecord)}
                alreadyReviewed={alreadyReviewed}
                identityLabel={
                  user
                    ? getIdentityBadgeLabel(
                        user.verifiedIdentityType,
                        user.githubUsername,
                        user.workDomain
                      )
                    : ""
                }
                isVerifiedIdentity={Boolean(
                  user && user.verifiedIdentityType !== "NONE"
                )}
              />
            </section>
          )}

          {/* Verified Teardowns Feed */}
          <section id="teardowns" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-medium text-ink">
                Verified Teardowns ({product.teardowns.length})
              </h2>
              <span className="font-mono text-xs text-ink-muted">
                Sorted by verification weight
              </span>
            </div>

            {product.teardowns.length === 0 ? (
              <div className="editorial-card p-8 text-center text-sm text-ink-secondary">
                No verified teardowns yet. Open and test {product.name} above to
                publish the first structured evaluation.
              </div>
            ) : (
              product.teardowns.map((td) => (
                <article key={td.id} className="editorial-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {td.author.name}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded border border-verified-border bg-verified-bg px-2 py-0.5 font-mono text-[11px] text-verified">
                        <ShieldCheck className="h-3 w-3" />
                        <span>
                          {getIdentityBadgeLabel(
                            td.author.verifiedIdentityType,
                            td.author.githubUsername,
                            td.author.workDomain
                          )}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-ink-muted tabular">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {td.timeSpentMinutes}m tested
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 font-medium ${
                          td.wouldRecommend === "YES"
                            ? "border-verified-border bg-verified-bg text-verified"
                            : td.wouldRecommend === "WITH_CAVEATS"
                            ? "border-caution-border bg-caution-bg text-caution"
                            : "border-danger-border bg-danger-bg text-danger"
                        }`}
                      >
                        {RECOMMENDATION_LABELS[td.wouldRecommend] ??
                          td.wouldRecommend}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                        Workflow Tested
                      </dt>
                      <dd className="mt-1 leading-relaxed text-ink">
                        {td.useCaseTested}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[11px] uppercase tracking-wide text-verified">
                        Strongest Feature
                      </dt>
                      <dd className="mt-1 leading-relaxed text-ink">
                        {td.strongestFeature}
                      </dd>
                    </div>
                    <div className="rounded-md border border-caution-border/70 bg-caution-bg/50 p-3">
                      <dt className="font-mono text-[11px] uppercase tracking-wide text-caution">
                        Missing Piece / Friction
                      </dt>
                      <dd className="mt-1 leading-relaxed text-ink">
                        {td.missingOrFriction}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </section>
        </div>

        {/* Sidebar: Pre-Flight Audit & Maker Card */}
        <aside className="space-y-6">
          <div className="editorial-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium text-ink">
                Automated Pre-Flight Audit
              </h2>
              {product.preflightPassed ? (
                <span className="rounded border border-verified-border bg-verified-bg px-2 py-0.5 font-mono text-[11px] font-medium text-verified">
                  PASSED
                </span>
              ) : (
                <span className="rounded border border-danger-border bg-danger-bg px-2 py-0.5 font-mono text-[11px] font-medium text-danger">
                  FLAGGED
                </span>
              )}
            </div>

            {preflight ? (
              <ul className="mt-4 space-y-2.5 text-xs">
                {preflight.checks.map((check) => (
                  <li
                    key={check.id}
                    className="flex items-start gap-2 border-b border-border pb-2.5 last:border-b-0 last:pb-0"
                  >
                    {check.status === "pass" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
                    ) : check.status === "warn" ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <div>
                      <div className="font-medium text-ink">{check.label}</div>
                      <div className="mt-0.5 text-ink-muted">{check.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                No automated audit log attached yet.
              </p>
            )}

            {product.githubRepoUrl && (
              <div className="mt-4 border-t border-border pt-3">
                <a
                  href={product.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-ink hover:underline"
                >
                  <GitBranch className="h-3.5 w-3.5 text-verified" />
                  <span>Inspect Public Repository</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <div className="editorial-card p-5">
            <div className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              Verified Maker
            </div>
            <div className="mt-2 font-serif text-lg font-medium text-ink">
              {product.maker.name}
            </div>
            <div className="mt-0.5 font-mono text-xs text-verified">
              {getIdentityBadgeLabel(
                product.maker.verifiedIdentityType,
                product.maker.githubUsername,
                product.maker.workDomain
              )}
            </div>
            {product.maker.bio && (
              <p className="mt-2.5 text-xs leading-relaxed text-ink-secondary">
                {product.maker.bio}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
