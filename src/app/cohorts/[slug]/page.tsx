import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getCurrentUser, getViewerSeed } from "@/lib/auth";
import { getCohortDropData } from "@/lib/queries";
import { CohortDropView } from "@/components/CohortDropView";

export default async function CohortArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [user, viewerSeed] = await Promise.all([
    getCurrentUser(),
    getViewerSeed(),
  ]);

  const { cohort, products, randomized } = await getCohortDropData({
    cohortSlug: slug,
    viewerUserId: user?.id ?? null,
    viewerSeed,
  });

  if (!cohort) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Current Weekly Drop</span>
      </Link>

      <header className="mt-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-border-strong bg-surface-subtle px-2 py-0.5 font-mono text-xs uppercase text-ink">
            {cohort.slug}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-verified-border bg-verified-bg px-2 py-0.5 font-mono text-xs text-verified">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {cohort.status === "ARCHIVED"
                ? "30-Day Active Survival Archive"
                : "Active Cohort"}
            </span>
          </span>
        </div>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {cohort.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          {cohort.summary}
        </p>
      </header>

      <section className="mt-6">
        <CohortDropView
          products={products}
          randomized={randomized}
          signedIn={Boolean(user)}
        />
      </section>
    </div>
  );
}
