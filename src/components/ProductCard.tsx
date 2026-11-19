import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  GitBranch,
  AlertTriangle,
} from "lucide-react";
import type { EnrichedProduct } from "@/lib/queries";
import {
  CATEGORY_LABELS,
  FUNDING_LABELS,
  formatRelativeDays,
  formatStartingPrice,
} from "@/lib/constants";
import { BookmarkButton } from "@/components/BookmarkButton";

interface ProductCardProps {
  product: EnrichedProduct;
  rankIndex?: number;
  randomized?: boolean;
  signedIn: boolean;
}

export function ProductCard({
  product,
  rankIndex,
  randomized,
  signedIn,
}: ProductCardProps) {
  return (
    <article className="editorial-card editorial-card-interactive p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {/* Rank / Monogram column */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-subtle font-mono text-sm font-semibold text-ink">
              {product.logoMark}
            </div>
            {rankIndex !== undefined && (
              <span className="font-mono text-[10px] text-ink-muted tabular">
                {randomized ? "SHUF" : `#${rankIndex + 1}`}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Link
                href={`/products/${product.slug}`}
                className="font-serif text-xl font-medium tracking-tight text-ink hover:underline"
              >
                {product.name}
              </Link>
              <span className="rounded border border-border bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-ink-secondary">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
              {product.preflightPassed && (
                <span className="inline-flex items-center gap-1 rounded border border-verified-border bg-verified-bg px-2 py-0.5 font-mono text-[11px] font-medium text-verified">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{formatRelativeDays(product.lastVerifiedActiveAt)}</span>
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              {product.tagline}
            </p>

            {/* Buyer-critical structured metadata */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-ink-secondary tabular">
              <span className="font-semibold text-ink">
                {formatStartingPrice(product.startingPriceUsd)}
              </span>
              <span>
                {product.noCreditCardTrial
                  ? "No-CC trial"
                  : "Card required"}
              </span>
              <span>{FUNDING_LABELS[product.fundingStage] ?? product.fundingStage}</span>
              {product.selfHostable && (
                <span className="text-verified">Self-hostable</span>
              )}
              {product.githubRepoUrl && (
                <span className="inline-flex items-center gap-1 text-ink-muted">
                  <GitBranch className="h-3 w-3" />
                  <span>Active repo</span>
                </span>
              )}
            </div>

            {/* Surface top verified friction snippet right on the card */}
            {product.topFriction && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-caution-border/70 bg-caution-bg/60 px-3 py-2 text-xs text-ink-secondary">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution" />
                <p className="line-clamp-2">
                  <span className="font-medium text-caution">
                    Top tester friction:{" "}
                  </span>
                  {product.topFriction}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action & Signal column */}
        <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-border pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/products/${product.slug}#teardowns`}
              className="inline-flex items-center gap-1.5 rounded-md border border-verified-border bg-verified-bg px-2.5 py-1.5 font-mono text-xs font-medium text-verified tabular transition-colors hover:bg-verified hover:text-canvas"
              title="Verified click-before-review teardowns"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>
                {product.teardownCount}{" "}
                {product.teardownCount === 1 ? "teardown" : "teardowns"}
              </span>
            </Link>
            <BookmarkButton
              slug={product.slug}
              initialBookmarked={product.isBookmarked}
              initialCount={product.bookmarkCount}
              signedIn={signedIn}
            />
          </div>

          <div className="flex items-center gap-2 sm:mt-2">
            <Link
              href={`/products/${product.slug}`}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-border-strong"
            >
              Read Dossier
            </Link>
            <a
              href={`/go/${product.slug}?ref=feed`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <span>Open &amp; Test</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
