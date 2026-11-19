"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  FUNDING_LABELS,
  formatStartingPrice,
} from "@/lib/constants";
import type { PreflightReport } from "@/lib/preflight";

export interface QueueProductItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  notForWhom: string;
  websiteUrl: string;
  tryNowUrl: string;
  pricingUrl: string;
  category: string;
  fundingStage: string;
  startingPriceUsd: number;
  status: string;
  preflightPassed: boolean;
  preflightReport: PreflightReport | null;
  makerName: string;
  makerEmail: string;
  createdAt: string;
}

export interface CohortOption {
  id: string;
  slug: string;
  title: string;
  status: string;
  usedSlots: number;
  maxSlots: number;
}

interface ReviewQueueClientProps {
  items: QueueProductItem[];
  cohorts: CohortOption[];
}

export function ReviewQueueClient({ items, cohorts }: ReviewQueueClientProps) {
  const router = useRouter();
  const [selectedCohorts, setSelectedCohorts] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, cohorts[0]?.id ?? ""])
      )
  );
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);

  async function submitDecision(
    productId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"
  ) {
    const feedback = (feedbackById[productId] ?? "").trim();
    if (feedback.length < 10) {
      setErrorById((prev) => ({
        ...prev,
        [productId]: "Write at least 10 characters of concrete editorial feedback.",
      }));
      return;
    }

    setBusyId(productId);
    setErrorById((prev) => ({ ...prev, [productId]: "" }));

    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          decision,
          cohortId: decision === "APPROVED" ? selectedCohorts[productId] : null,
          feedback,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorById((prev) => ({
          ...prev,
          [productId]: data.error || "Decision failed.",
        }));
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function runHealthSweep() {
    setSweeping(true);
    setSweepMsg(null);
    try {
      const res = await fetch("/api/admin/health-check", { method: "POST" });
      const data = (await res.json()) as {
        checkedCount?: number;
        error?: string;
      };
      if (res.ok) {
        setSweepMsg(
          `Active verification sweep complete across ${data.checkedCount ?? 0} live products.`
        );
        router.refresh();
      } else {
        setSweepMsg(data.error || "Sweep failed.");
      }
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cohort Slot Capacity & Sweep Bar */}
      <div className="editorial-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {cohorts.map((c) => (
            <div
              key={c.id}
              className="rounded-md border border-border bg-canvas px-3 py-1.5 font-mono text-xs tabular"
            >
              <span className="font-semibold text-ink">{c.slug.toUpperCase()}</span>{" "}
              <span className="text-ink-muted">
                ({c.usedSlots}/{c.maxSlots} slots · {c.status})
              </span>
            </div>
          ))}
        </div>

        <button
          id="run-health-sweep-btn"
          type="button"
          disabled={sweeping}
          onClick={runHealthSweep}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 font-mono text-xs font-medium text-ink hover:border-ink disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${sweeping ? "animate-spin" : ""}`} />
          <span>
            {sweeping ? "Running Sweep..." : "Re-run Live Active Health Sweep"}
          </span>
        </button>
      </div>

      {sweepMsg && (
        <div className="rounded-md border border-verified-border bg-verified-bg px-4 py-2.5 text-xs font-medium text-verified">
          {sweepMsg}
        </div>
      )}

      {items.length === 0 ? (
        <div className="editorial-card p-10 text-center">
          <h2 className="font-serif text-xl text-ink">
            Editorial review queue is clear
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            All submitted products have been reviewed and logged.
          </p>
        </div>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            data-product-slug={item.slug}
            className="editorial-card p-6"
          >
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-2xl font-medium text-ink">
                    {item.name}
                  </h2>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${
                      item.preflightPassed
                        ? "border-verified-border bg-verified-bg text-verified"
                        : "border-danger-border bg-danger-bg text-danger"
                    }`}
                  >
                    {item.preflightPassed ? "PRE-FLIGHT PASSED" : "PRE-FLIGHT FLAGGED"}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    {CATEGORY_LABELS[item.category]} ·{" "}
                    {formatStartingPrice(item.startingPriceUsd)} ·{" "}
                    {FUNDING_LABELS[item.fundingStage]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{item.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-ink-muted">
                  <span>
                    Maker: {item.makerName} ({item.makerEmail})
                  </span>
                  <a
                    href={item.tryNowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink underline"
                  >
                    Try-Now URL <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={item.pricingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink underline"
                  >
                    Pricing URL <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-mono uppercase text-ink-muted">
                    Description
                  </div>
                  <p className="mt-1 leading-relaxed text-ink">
                    {item.description}
                  </p>
                </div>
                <div className="rounded-md border border-caution-border bg-caution-bg/50 p-3">
                  <div className="font-mono uppercase text-caution">
                    Maker&apos;s &ldquo;Who this is NOT for&rdquo; Disclosure
                  </div>
                  <p className="mt-1 text-ink">{item.notForWhom}</p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-canvas p-4 text-xs">
                <div className="font-mono font-semibold uppercase text-ink">
                  Automated Pre-Flight Diagnostics
                </div>
                {item.preflightReport ? (
                  <ul className="mt-2.5 space-y-2">
                    {item.preflightReport.checks.map((c) => (
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
                ) : (
                  <p className="mt-2 text-ink-muted">No automated report saved.</p>
                )}
              </div>
            </div>

            {/* Editorial Action Controls */}
            <div className="mt-5 border-t border-border pt-4">
              {errorById[item.id] && (
                <div className="mb-3 rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
                  {errorById[item.id]}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label
                    htmlFor={`feedback-${item.id}`}
                    className="block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Editorial Review Note (logged in audit trail &amp; shown to
                    maker)
                  </label>
                  <input
                    id={`feedback-${item.id}`}
                    type="text"
                    value={feedbackById[item.id] ?? ""}
                    onChange={(e) =>
                      setFeedbackById((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="e.g., Tested sandbox live; pricing clear, approved for Week 47 — or Rejected: waitlist-only landing page."
                    className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`cohort-${item.id}`}
                    className="block font-mono text-[11px] uppercase text-ink-muted"
                  >
                    Cohort Assignment (if approving)
                  </label>
                  <select
                    id={`cohort-${item.id}`}
                    value={selectedCohorts[item.id] ?? ""}
                    onChange={(e) =>
                      setSelectedCohorts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink"
                  >
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.slug.toUpperCase()} ({c.usedSlots}/{c.maxSlots}) ·{" "}
                        {c.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => submitDecision(item.id, "REJECTED")}
                  className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-1.5 text-xs font-medium text-danger hover:bg-danger hover:text-canvas disabled:opacity-50"
                >
                  Reject (Slop / Waitlist)
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => submitDecision(item.id, "CHANGES_REQUESTED")}
                  className="rounded-md border border-caution-border bg-caution-bg px-3.5 py-1.5 text-xs font-medium text-caution hover:bg-caution hover:text-canvas disabled:opacity-50"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => submitDecision(item.id, "APPROVED")}
                  className="rounded-md border border-verified bg-verified px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-50"
                >
                  Approve &amp; Assign Cohort
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
