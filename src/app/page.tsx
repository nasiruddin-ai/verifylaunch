import Link from "next/link";
import { Shuffle, ShieldCheck, ArrowRight, Calendar } from "lucide-react";
import { getCurrentUser, getViewerSeed } from "@/lib/auth";
import { getCohortDropData } from "@/lib/queries";
import { CohortDropView } from "@/components/CohortDropView";

export default async function HomePage() {
  const [user, viewerSeed] = await Promise.all([
    getCurrentUser(),
    getViewerSeed(),
  ]);

  const { cohort, allCohorts, products, randomized } = await getCohortDropData({
    viewerUserId: user?.id ?? null,
    viewerSeed,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Editorial Masthead */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
              Curated Weekly Drop · Bootstrapped B2B &amp; Dev SaaS
            </p>
            <h1 className="mt-2 font-serif text-4xl font-medium leading-[1.12] tracking-tight text-ink sm:text-5xl">
              {cohort ? cohort.title : "Human-tested launches, zero upvote rings."}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              {cohort?.summary ??
                "Every listed tool is live today, transparently priced, and ranked strictly by click-verified teardowns from real operators and engineers."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/directory"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              <span>Filter All Verified Tools</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <span>Submit a Live Product</span>
            </Link>
          </div>
        </div>

        {/* Integrity mechanics strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-verified" />
              <span>Anti-Slop Gate</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Waitlists, hidden pricing, and weekend wrappers are blocked before
              reaching a cohort.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs font-medium text-ink">
              <Shuffle className="h-4 w-4 text-verified" />
              <span>
                {randomized
                  ? "48h Fair Shuffle Active"
                  : "Ranked by Verified Teardowns"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              {randomized
                ? "Display order is randomized per viewer for the first 48 hours so timezone and audience size cannot lock in #1."
                : "Rankings weight verified GitHub & work-email teardowns; drive-by bookmarks are tightly capped."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs font-medium text-ink">
              <Calendar className="h-4 w-4 text-verified" />
              <span>7-Day Cohort Window</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              No 24-hour panic cliff. Products stay live all week and undergo
              30-day active verification checks.
            </p>
          </div>
        </div>
      </section>

      {/* Cohort Switcher */}
      {allCohorts.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-muted">Cohorts:</span>
          {allCohorts.map((c) => {
            const isCurrent = c.id === cohort?.id;
            return (
              <Link
                key={c.id}
                href={c.status === "ACTIVE" ? "/" : `/cohorts/${c.slug}`}
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                  isCurrent
                    ? "border-ink bg-ink text-canvas"
                    : "border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink"
                }`}
              >
                {c.slug.toUpperCase()} ({c._count.products})
                {c.status === "ACTIVE" ? " · Live" : " · Archive"}
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Active Cohort Drop */}
      <section className="mt-6">
        {products.length > 0 ? (
          <CohortDropView
            products={products}
            randomized={randomized}
            signedIn={Boolean(user)}
          />
        ) : (
          <div className="editorial-card p-10 text-center">
            <h2 className="font-serif text-xl text-ink">
              No live products in this cohort yet
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Submit a vetted, live B2B or developer tool to enter the next
              weekly drop.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
