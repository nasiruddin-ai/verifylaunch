"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, LayoutList, Table2, X } from "lucide-react";
import type { EnrichedProduct } from "@/lib/queries";
import {
  CATEGORY_LABELS,
  FUNDING_LABELS,
  formatStartingPrice,
} from "@/lib/constants";
import { ProductCard } from "@/components/ProductCard";

interface CohortDropViewProps {
  products: EnrichedProduct[];
  randomized: boolean;
  signedIn: boolean;
}

export function CohortDropView({
  products,
  randomized,
  signedIn,
}: CohortDropViewProps) {
  const [mode, setMode] = useState<"feed" | "matrix">("feed");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-ink-muted tabular">
          {products.length} vetted{" "}
          {products.length === 1 ? "product" : "products"} in this cohort
        </p>

        <div
          role="tablist"
          aria-label="Cohort display mode"
          className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs"
        >
          <button
            id="view-mode-feed"
            type="button"
            role="tab"
            aria-selected={mode === "feed"}
            onClick={() => setMode("feed")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 font-medium transition-colors ${
              mode === "feed"
                ? "bg-ink text-canvas"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>Dossier Feed</span>
          </button>
          <button
            id="view-mode-matrix"
            type="button"
            role="tab"
            aria-selected={mode === "matrix"}
            onClick={() => setMode("matrix")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 font-medium transition-colors ${
              mode === "matrix"
                ? "bg-ink text-canvas"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            <span>Comparison Matrix</span>
          </button>
        </div>
      </div>

      {mode === "feed" ? (
        <div className="space-y-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              rankIndex={index}
              randomized={randomized}
              signedIn={signedIn}
            />
          ))}
        </div>
      ) : (
        <div className="editorial-card overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-subtle font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">Product &amp; Category</th>
                <th className="px-4 py-3 font-medium">Starting Price</th>
                <th className="px-4 py-3 font-medium">No-CC Trial</th>
                <th className="px-4 py-3 font-medium">Self-Host / Export</th>
                <th className="px-4 py-3 font-medium">Funding</th>
                <th className="px-4 py-3 font-medium">Verified Teardowns</th>
                <th className="px-4 py-3 font-medium">Top Reported Friction</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="align-top transition-colors hover:bg-surface-subtle/50"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-serif text-base font-medium text-ink hover:underline"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
                      {CATEGORY_LABELS[product.category] ?? product.category}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-ink tabular">
                    {formatStartingPrice(product.startingPriceUsd)}
                  </td>
                  <td className="px-4 py-3.5">
                    {product.noCreditCardTrial ? (
                      <span className="inline-flex items-center gap-1 font-mono text-verified">
                        <Check className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-ink-muted">
                        <X className="h-3.5 w-3.5" /> Card req.
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-ink-secondary">
                    <div>{product.selfHostable ? "Self-hostable" : "Cloud only"}</div>
                    <div className="text-[11px] text-ink-muted">
                      {product.dataExportable ? "Data exportable" : "Limited export"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-ink-secondary">
                    {FUNDING_LABELS[product.fundingStage] ?? product.fundingStage}
                  </td>
                  <td className="px-4 py-3.5 font-mono tabular">
                    <span className="font-semibold text-verified">
                      {product.teardownCount}
                    </span>{" "}
                    <span className="text-ink-muted">
                      ({product.recommendCount} rec.)
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3.5 text-ink-secondary">
                    {product.topFriction ? (
                      <p className="line-clamp-2 leading-relaxed">
                        {product.topFriction}
                      </p>
                    ) : (
                      <span className="italic text-ink-muted">
                        Awaiting first verified teardown
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <a
                      href={`/go/${product.slug}?ref=matrix`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-ink bg-ink px-2.5 py-1 font-medium text-canvas hover:opacity-90"
                    >
                      Test <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
