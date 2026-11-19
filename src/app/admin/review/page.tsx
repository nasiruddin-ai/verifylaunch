import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parsePreflightReport } from "@/lib/preflight";
import { ReviewQueueClient } from "@/components/ReviewQueueClient";

export const metadata: Metadata = {
  title: "Editorial Review Queue",
  description:
    "Human anti-slop vetting queue for VerifyLaunch cohorts, pre-flight diagnostics, and audit log.",
};

export default async function AdminReviewPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "EDITOR") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="editorial-card p-8">
          <div className="flex items-center gap-2 font-mono text-xs uppercase text-caution">
            <Shield className="h-4 w-4" />
            <span>Editorial Access Required</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-medium text-ink">
            Editor role required to moderate the review queue
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            In local development mode, switch to the <strong>Editor</strong>{" "}
            persona in the top dev bar to test approving, rejecting, and
            scheduling submissions.
          </p>
          <Link
            href="/auth"
            className="mt-5 inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
          >
            Go to Sign In / Persona Switcher
          </Link>
        </div>
      </div>
    );
  }

  const [pendingProducts, cohorts, recentActions] = await Promise.all([
    prisma.product.findMany({
      where: { status: { in: ["SUBMITTED", "CHANGES_REQUESTED"] } },
      orderBy: { createdAt: "asc" },
      include: {
        maker: { select: { name: true, email: true } },
      },
    }),
    prisma.cohort.findMany({
      where: { status: { in: ["ACTIVE", "UPCOMING"] } },
      orderBy: { startsAt: "asc" },
      include: {
        _count: {
          select: { products: { where: { status: { in: ["APPROVED", "LIVE"] } } } },
        },
      },
    }),
    prisma.reviewAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        product: { select: { name: true, slug: true } },
        editor: { select: { name: true } },
        cohort: { select: { slug: true } },
      },
    }),
  ]);

  const queueItems = pendingProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    notForWhom: p.notForWhom,
    websiteUrl: p.websiteUrl,
    tryNowUrl: p.tryNowUrl,
    pricingUrl: p.pricingUrl,
    category: p.category,
    fundingStage: p.fundingStage,
    startingPriceUsd: p.startingPriceUsd,
    status: p.status,
    preflightPassed: p.preflightPassed,
    preflightReport: parsePreflightReport(p.preflightReportJson),
    makerName: p.maker.name,
    makerEmail: p.maker.email,
    createdAt: p.createdAt.toISOString(),
  }));

  const cohortOptions = cohorts.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    status: c.status,
    usedSlots: c._count.products,
    maxSlots: c.maxSlots,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
          Editorial Curation &amp; Anti-Slop Moderation
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Editorial Review Queue ({queueItems.length})
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Every cohort slot is hand-verified against live URLs, pricing
          transparency, and honest non-ICP disclosures. All decisions are
          recorded in the audit trail below.
        </p>
      </header>

      <ReviewQueueClient items={queueItems} cohorts={cohortOptions} />

      {/* Audit Log */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-medium text-ink">
          Recent Editorial Audit Log
        </h2>
        <div className="mt-4 editorial-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-subtle font-mono text-[11px] uppercase text-ink-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Cohort</th>
                <th className="px-4 py-3 font-medium">Editor</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActions.map((act) => (
                <tr key={act.id}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {act.product.name}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] ${
                        act.decision === "APPROVED"
                          ? "border-verified-border bg-verified-bg text-verified"
                          : act.decision === "REJECTED"
                          ? "border-danger-border bg-danger-bg text-danger"
                          : "border-caution-border bg-caution-bg text-caution"
                      }`}
                    >
                      {act.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-muted">
                    {act.cohort?.slug.toUpperCase() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {act.editor.name}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {act.feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
