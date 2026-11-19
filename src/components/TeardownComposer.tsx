"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { RECOMMENDATION_OPTIONS } from "@/lib/constants";

interface TeardownComposerProps {
  slug: string;
  productName: string;
  signedIn: boolean;
  isMaker: boolean;
  hasVerifiedVisit: boolean;
  alreadyReviewed: boolean;
  identityLabel: string;
  isVerifiedIdentity: boolean;
}

export function TeardownComposer({
  slug,
  productName,
  signedIn,
  isMaker,
  hasVerifiedVisit,
  alreadyReviewed,
  identityLabel,
  isVerifiedIdentity,
}: TeardownComposerProps) {
  const router = useRouter();
  const [unlockedLocal, setUnlockedLocal] = useState(hasVerifiedVisit);
  const [useCaseTested, setUseCaseTested] = useState("");
  const [strongestFeature, setStrongestFeature] = useState("");
  const [missingOrFriction, setMissingOrFriction] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<
    "YES" | "WITH_CAVEATS" | "NOT_YET"
  >("YES");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isUnlocked = hasVerifiedVisit || unlockedLocal;

  function handleTrackedVisitClick() {
    // Allow brief delay for /go/[slug] to commit ProductVisit, then refresh server state
    setTimeout(() => {
      setUnlockedLocal(true);
      router.refresh();
    }, 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${slug}/teardowns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          useCaseTested,
          strongestFeature,
          missingOrFriction,
          wouldRecommend,
          timeSpentMinutes,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!res.ok) {
        const firstFieldErr = data.fieldErrors
          ? Object.values(data.fieldErrors).flat()[0]
          : null;
        setError(firstFieldErr || data.error || "Failed to publish teardown.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error while publishing teardown.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="editorial-card p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 text-ink-muted" />
          <div>
            <h3 className="font-serif text-lg font-medium text-ink">
              Sign in to publish a Verified Teardown
            </h3>
            <p className="mt-1 text-sm text-ink-secondary">
              VerifyLaunch replaces anonymous upvotes with structured evaluations
              from verified GitHub and work-email testers.
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
            >
              Sign in &amp; Verify Identity
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isMaker) {
    return (
      <div className="editorial-card bg-surface-subtle p-5 text-sm text-ink-secondary">
        You are the maker of <strong className="text-ink">{productName}</strong>.
        Makers cannot review their own launches—view buyer objections and click
        conversion in your{" "}
        <Link href="/maker" className="font-medium text-ink underline">
          Maker Scorecard
        </Link>
        .
      </div>
    );
  }

  if (alreadyReviewed || success) {
    return (
      <div className="editorial-card border-verified-border bg-verified-bg p-5">
        <div className="flex items-center gap-2 font-medium text-verified">
          <CheckCircle2 className="h-4 w-4" />
          <span>Verified Teardown Published</span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          Your structured evaluation is live and weighted in {productName}&apos;s
          verified signal score. It also counts toward your reciprocal peer
          teardown eligibility on{" "}
          <Link href="/submit" className="font-medium text-ink underline">
            /submit
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="editorial-card p-6">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-caution">
          <Lock className="h-3.5 w-3.5" />
          <span>Click-Before-Teardown Gate Active</span>
        </div>
        <h3 className="mt-2 font-serif text-xl font-medium text-ink">
          Test {productName} before reviewing it
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          To eliminate drive-by hype comments, you must open the live product
          through our tracked test link before the teardown form unlocks.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-strong bg-canvas p-4">
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Step 1 · Required
            </div>
            <p className="mt-1 text-sm font-medium text-ink">
              Open &amp; evaluate the live product
            </p>
            <a
              id="unlock-teardown-visit-link"
              href={`/go/${slug}?ref=teardown-gate`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackedVisitClick}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3.5 py-2 text-xs font-medium text-canvas hover:opacity-90"
            >
              <span>Open &amp; Test {productName}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-surface-subtle/60 p-4">
            <div className="font-mono text-[11px] uppercase text-ink-muted">
              Step 2 · Locked
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              Write your structured 3-part teardown (workflow tested, strongest
              feature, real friction).
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-secondary hover:border-border-strong hover:text-ink"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Already tested? Refresh status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="editorial-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-verified">
            <ShieldCheck className="h-4 w-4" />
            <span>Visit Verified · Teardown Composer Unlocked</span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-medium text-ink">
            Publish a Verified Teardown for {productName}
          </h3>
        </div>
        <div className="rounded border border-verified-border bg-verified-bg px-2.5 py-1 font-mono text-[11px] text-verified">
          {identityLabel} · {isVerifiedIdentity ? "1.5x signal weight" : "1.0x weight"}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-xs font-medium text-danger">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="teardown-usecase"
            className="block text-xs font-semibold text-ink"
          >
            1. Concrete workflow you tested (min 20 chars)
          </label>
          <textarea
            id="teardown-usecase"
            required
            minLength={20}
            rows={2}
            value={useCaseTested}
            onChange={(e) => setUseCaseTested(e.target.value)}
            placeholder="e.g., Tested the sandbox with a staging Postgres schema and ran two simulated slow queries..."
            className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="teardown-strongest"
            className="block text-xs font-semibold text-ink"
          >
            2. What genuinely worked well (min 20 chars)
          </label>
          <textarea
            id="teardown-strongest"
            required
            minLength={20}
            rows={2}
            value={strongestFeature}
            onChange={(e) => setStrongestFeature(e.target.value)}
            placeholder="Specific strengths, speed, onboarding clarity, or pricing transparency..."
            className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="teardown-friction"
            className="block text-xs font-semibold text-ink"
          >
            3. Missing piece, caveat, or real friction (min 20 chars)
          </label>
          <textarea
            id="teardown-friction"
            required
            minLength={20}
            rows={2}
            value={missingOrFriction}
            onChange={(e) => setMissingOrFriction(e.target.value)}
            placeholder="Every real evaluation surfaces a tradeoff or gap—what held you back or needs work?"
            className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="teardown-recommend"
              className="block text-xs font-semibold text-ink"
            >
              Verdict
            </label>
            <select
              id="teardown-recommend"
              value={wouldRecommend}
              onChange={(e) =>
                setWouldRecommend(
                  e.target.value as "YES" | "WITH_CAVEATS" | "NOT_YET"
                )
              }
              className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {RECOMMENDATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="teardown-minutes"
              className="block text-xs font-semibold text-ink"
            >
              Minutes spent testing
            </label>
            <input
              id="teardown-minutes"
              type="number"
              min={5}
              max={240}
              value={timeSpentMinutes}
              onChange={(e) => setTimeSpentMinutes(Number(e.target.value))}
              className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-ink-muted">
          No hollow &ldquo;Congrats!&rdquo; blurbs—structured notes help real
          buyers decide.
        </p>
        <button
          id="publish-teardown-btn"
          type="submit"
          disabled={submitting}
          className="rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Publishing..." : "Publish Verified Teardown"}
        </button>
      </div>
    </form>
  );
}
