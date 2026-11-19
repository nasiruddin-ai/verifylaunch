"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, RotateCcw } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

export function DirectoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const category = searchParams.get("category") ?? "ALL";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const noCC = searchParams.get("noCC") === "true";
  const bootstrapped = searchParams.get("bootstrapped") === "true";
  const selfHost = searchParams.get("selfHost") === "true";
  const sort = searchParams.get("sort") ?? "signal";

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "" || val === "false" || val === "ALL") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/directory?${qs}` : "/directory");
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: q.trim() || null });
  }

  const hasActiveFilters = Boolean(
    (category && category !== "ALL") ||
      maxPrice ||
      noCC ||
      bootstrapped ||
      selfHost ||
      searchParams.get("q")
  );

  return (
    <div className="editorial-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="directory-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by job-to-be-done (e.g., webhooks, Postgres, Stripe dunning)..."
            className="w-full rounded-md border border-border bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="filter-category"
            aria-label="Filter by category"
            value={category}
            onChange={(e) => updateParams({ category: e.target.value })}
            className="rounded-md border border-border bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            id="filter-max-price"
            aria-label="Filter by starting price"
            value={maxPrice}
            onChange={(e) => updateParams({ maxPrice: e.target.value || null })}
            className="rounded-md border border-border bg-canvas px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Any price</option>
            <option value="0">Free / OSS ($0)</option>
            <option value="29">Up to $29/mo</option>
            <option value="49">Up to $49/mo</option>
          </select>

          <select
            id="filter-sort"
            aria-label="Sort products"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="rounded-md border border-border bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
          >
            <option value="signal">Highest Verified Signal</option>
            <option value="newest">Most Recently Launched</option>
            <option value="price">Lowest Starting Price</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="toggle-nocc"
            type="button"
            onClick={() => updateParams({ noCC: noCC ? null : "true" })}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              noCC
                ? "border-verified bg-verified-bg font-medium text-verified"
                : "border-border bg-canvas text-ink-secondary hover:border-border-strong"
            }`}
          >
            No-Credit-Card Trial
          </button>
          <button
            id="toggle-bootstrapped"
            type="button"
            onClick={() =>
              updateParams({ bootstrapped: bootstrapped ? null : "true" })
            }
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              bootstrapped
                ? "border-verified bg-verified-bg font-medium text-verified"
                : "border-border bg-canvas text-ink-secondary hover:border-border-strong"
            }`}
          >
            Bootstrapped / Indie Only
          </button>
          <button
            id="toggle-selfhost"
            type="button"
            onClick={() => updateParams({ selfHost: selfHost ? null : "true" })}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              selfHost
                ? "border-verified bg-verified-bg font-medium text-verified"
                : "border-border bg-canvas text-ink-secondary hover:border-border-strong"
            }`}
          >
            Self-Hostable
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isPending && (
            <span className="font-mono text-[11px] text-ink-muted">
              Updating...
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                router.push("/directory");
              }}
              className="inline-flex items-center gap-1 font-mono text-xs text-ink-muted hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
