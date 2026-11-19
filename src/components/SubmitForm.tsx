"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  FUNDING_STAGES,
  PRICING_MODELS,
  PRODUCT_CATEGORIES,
  REVENUE_BANDS,
} from "@/lib/constants";
import type { PreflightReport } from "@/lib/preflight";
import type { ReciprocityStatus } from "@/lib/reciprocity";

interface SubmitFormProps {
  signedIn: boolean;
  isEditor: boolean;
  reciprocity: ReciprocityStatus;
  suggestedProducts: Array<{ slug: string; name: string; tagline: string }>;
}

export function SubmitForm({
  signedIn,
  isEditor,
  reciprocity,
  suggestedProducts,
}: SubmitFormProps) {
  const router = useRouter();
  const canSubmit = signedIn && (reciprocity.eligible || isEditor);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [notForWhom, setNotForWhom] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tryNowUrl, setTryNowUrl] = useState("");
  const [pricingUrl, setPricingUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [category, setCategory] = useState("DEV_INFRA");
  const [pricingModel, setPricingModel] = useState("FREE_TIER");
  const [startingPriceUsd, setStartingPriceUsd] = useState(19);
  const [noCreditCardTrial, setNoCreditCardTrial] = useState(true);
  const [selfHostable, setSelfHostable] = useState(false);
  const [dataExportable, setDataExportable] = useState(true);
  const [fundingStage, setFundingStage] = useState("BOOTSTRAPPED");
  const [revenueBand, setRevenueBand] = useState("EARLY_PAYING");

  const [probing, setProbing] = useState(false);
  const [preflight, setPreflight] = useState<PreflightReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreflight() {
    setError(null);
    if (!websiteUrl || !tryNowUrl || !pricingUrl) {
      setError("Fill in Website, Try-Now, and Pricing URLs before running pre-flight.");
      return;
    }
    setProbing(true);
    try {
      const res = await fetch("/api/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          tryNowUrl,
          pricingUrl,
          githubRepoUrl: githubRepoUrl || null,
        }),
      });
      const data = (await res.json()) as {
        report?: PreflightReport;
        error?: string;
      };
      if (!res.ok || !data.report) {
        setError(data.error || "Pre-flight check failed.");
      } else {
        setPreflight(data.report);
      }
    } catch {
      setError("Network error while running pre-flight diagnostics.");
    } finally {
      setProbing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          notForWhom,
          websiteUrl,
          tryNowUrl,
          pricingUrl,
          demoVideoUrl,
          githubRepoUrl,
          category,
          pricingModel,
          startingPriceUsd,
          noCreditCardTrial,
          selfHostable,
          dataExportable,
          fundingStage,
          revenueBand,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        preflightReport?: PreflightReport;
        fieldErrors?: Record<string, string[]>;
      };

      if (data.preflightReport) {
        setPreflight(data.preflightReport);
      }

      if (!res.ok) {
        const firstFieldErr = data.fieldErrors
          ? Object.values(data.fieldErrors).flat()[0]
          : null;
        setError(firstFieldErr || data.error || "Submission failed.");
        return;
      }

      router.push("/maker?submitted=1");
      router.refresh();
    } catch {
      setError("Network error while submitting product.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="editorial-card p-8">
        <h2 className="font-serif text-2xl font-medium text-ink">
          Sign in to submit a live product
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          All makers authenticate with GitHub or a verified work email so buyers
          know a real builder stands behind every launch.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
        >
          Sign in &amp; Verify Identity
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reciprocal Peer Teardown Gate Card */}
      <div
        className={`editorial-card p-5 ${
          canSubmit
            ? "border-verified-border bg-verified-bg"
            : "border-caution-border bg-caution-bg"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wide">
            {canSubmit ? (
              <>
                <ShieldCheck className="h-4 w-4 text-verified" />
                <span className="text-verified">
                  Reciprocal Quality Gate Unlocked
                </span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-caution" />
                <span className="text-caution">
                  Reciprocal Quality Gate ({reciprocity.completedCount} /{" "}
                  {reciprocity.requiredCount} Peer Teardowns Completed)
                </span>
              </>
            )}
          </div>
          {isEditor && !reciprocity.eligible && (
            <span className="rounded border border-verified-border bg-surface px-2 py-0.5 font-mono text-[11px] text-verified">
              Editor Concierge Override Active
            </span>
          )}
        </div>

        {canSubmit ? (
          <p className="mt-1.5 text-sm text-ink-secondary">
            You have completed {reciprocity.completedCount} verified peer{" "}
            {reciprocity.completedCount === 1 ? "teardown" : "teardowns"}. Your
            submission enters the human editorial review queue for the next
            available weekly cohort.
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-ink">
              Instead of charging $49 or forcing fake upvote swaps, free
              cohort submissions require{" "}
              <strong>{reciprocity.requiredCount} verified teardowns</strong> of
              peer tools. Complete{" "}
              <strong>{reciprocity.remaining} more</strong> to unlock submission:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedProducts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}#write-teardown`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                >
                  <span>Test &amp; Review {p.name} →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submission Form */}
      <form
        onSubmit={handleSubmit}
        className={`editorial-card p-6 sm:p-8 ${
          !canSubmit ? "opacity-65" : ""
        }`}
      >
        <div className="border-b border-border pb-4">
          <h2 className="font-serif text-2xl font-medium text-ink">
            Anti-Slop Submission Dossier
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Every field below is shown directly to skeptical B2B buyers.
            Waitlists, hidden pricing, and buzzword fluff are automatically
            flagged or rejected.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-danger-border bg-danger-bg px-4 py-3 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="submit-name"
                className="block text-xs font-semibold text-ink"
              >
                Product Name *
              </label>
              <input
                id="submit-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., QueueGuard"
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="submit-category"
                className="block text-xs font-semibold text-ink"
              >
                Primary Buyer Job / Category *
              </label>
              <select
                id="submit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="submit-tagline"
              className="block text-xs font-semibold text-ink"
            >
              Plain-English Value Prop (no hype adjectives, 12–140 chars) *
            </label>
            <input
              id="submit-tagline"
              required
              minLength={12}
              maxLength={140}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Dead-letter queue and 1-click replay for Stripe & GitHub webhooks."
              className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="submit-description"
              className="block text-xs font-semibold text-ink"
            >
              How it works in production (min 40 chars) *
            </label>
            <textarea
              id="submit-description"
              required
              minLength={40}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain architecture, setup time, integrations, and what problem it replaces..."
              className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="submit-notfor"
              className="block text-xs font-semibold text-caution"
            >
              Who this is NOT for (mandatory anti-hype disclosure, min 20 chars) *
            </label>
            <textarea
              id="submit-notfor"
              required
              minLength={20}
              rows={2}
              value={notForWhom}
              onChange={(e) => setNotForWhom(e.target.value)}
              placeholder="e.g., Not for enterprise teams needing HIPAA BAAs or Kafka-scale streaming; built for 1–25 person SaaS teams."
              className="mt-1.5 w-full rounded-md border border-caution-border bg-caution-bg/30 px-3 py-2 text-sm text-ink focus:border-caution focus:outline-none"
            />
          </div>

          {/* Live URLs + Pre-Flight Trigger */}
          <div className="rounded-lg border border-border bg-surface-subtle/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs font-semibold uppercase text-ink">
                Live Verification URLs (Public HTTPS Required)
              </div>
              <button
                id="run-preflight-btn"
                type="button"
                disabled={probing}
                onClick={handlePreflight}
                className="inline-flex items-center gap-1.5 rounded-md border border-verified bg-verified px-3 py-1.5 font-mono text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {probing ? "Probing URLs..." : "Run Automated Pre-Flight Check"}
                </span>
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="submit-website"
                  className="block text-xs font-medium text-ink"
                >
                  Website URL *
                </label>
                <input
                  id="submit-website"
                  type="url"
                  required
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourtool.dev"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="submit-trynow"
                  className="block text-xs font-medium text-ink"
                >
                  Live Try-Now / Sandbox URL *
                </label>
                <input
                  id="submit-trynow"
                  type="url"
                  required
                  value={tryNowUrl}
                  onChange={(e) => setTryNowUrl(e.target.value)}
                  placeholder="https://app.yourtool.dev/demo"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="submit-pricing-url"
                  className="block text-xs font-medium text-ink"
                >
                  Public Pricing Page URL *
                </label>
                <input
                  id="submit-pricing-url"
                  type="url"
                  required
                  value={pricingUrl}
                  onChange={(e) => setPricingUrl(e.target.value)}
                  placeholder="https://yourtool.dev/pricing"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="submit-video"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  60-Sec Unedited Walkthrough URL (optional)
                </label>
                <input
                  id="submit-video"
                  type="url"
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                  placeholder="https://loom.com/share/..."
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="submit-github"
                  className="block text-xs font-medium text-ink-secondary"
                >
                  Public GitHub Repo URL (optional freshness signal)
                </label>
                <input
                  id="submit-github"
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            {preflight && (
              <div className="mt-4 rounded-md border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-ink">
                    Pre-Flight Diagnostics
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${
                      preflight.passed
                        ? "border-verified-border bg-verified-bg text-verified"
                        : "border-danger-border bg-danger-bg text-danger"
                    }`}
                  >
                    {preflight.passed ? "READY FOR REVIEW" : "HARD FAILURE"}
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-xs">
                  {preflight.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2">
                      {c.status === "pass" ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" />
                      ) : c.status === "warn" ? (
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                      )}
                      <div>
                        <span className="font-medium text-ink">{c.label}:</span>{" "}
                        <span className="text-ink-secondary">{c.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Buyer Filter Specs */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label
                htmlFor="submit-pricing-model"
                className="block text-xs font-semibold text-ink"
              >
                Pricing Model
              </label>
              <select
                id="submit-pricing-model"
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-ink"
              >
                {PRICING_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="submit-starting-price"
                className="block text-xs font-semibold text-ink"
              >
                Starting USD / mo
              </label>
              <input
                id="submit-starting-price"
                type="number"
                min={0}
                max={10000}
                value={startingPriceUsd}
                onChange={(e) => setStartingPriceUsd(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink"
              />
            </div>
            <div>
              <label
                htmlFor="submit-funding"
                className="block text-xs font-semibold text-ink"
              >
                Funding Stage
              </label>
              <select
                id="submit-funding"
                value={fundingStage}
                onChange={(e) => setFundingStage(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-ink"
              >
                {FUNDING_STAGES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="submit-revenue"
                className="block text-xs font-semibold text-ink"
              >
                Traction Disclosure
              </label>
              <select
                id="submit-revenue"
                value={revenueBand}
                onChange={(e) => setRevenueBand(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-ink"
              >
                {REVENUE_BANDS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 pt-1 text-xs text-ink">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={noCreditCardTrial}
                onChange={(e) => setNoCreditCardTrial(e.target.checked)}
                className="accent-verified"
              />
              <span>Try without credit card</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selfHostable}
                onChange={(e) => setSelfHostable(e.target.checked)}
                className="accent-verified"
              />
              <span>Self-hostable option</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={dataExportable}
                onChange={(e) => setDataExportable(e.target.checked)}
                className="accent-verified"
              />
              <span>Full customer data export</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
          <p className="text-xs text-ink-muted">
            Submissions are manually tested by an editor before entering a
            Tuesday cohort.
          </p>
          <button
            id="submit-product-btn"
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-md border border-ink bg-ink px-5 py-2.5 text-xs font-medium text-canvas hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting
              ? "Running Gate & Submitting..."
              : "Submit for Editorial Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
