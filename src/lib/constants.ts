export const PRODUCT_CATEGORIES = [
  { value: "DEV_INFRA", label: "Dev Infra & Tooling" },
  { value: "SAAS_OPS", label: "SaaS Ops & Support" },
  { value: "ANALYTICS", label: "Analytics & Telemetry" },
  { value: "BILLING_FINOPS", label: "Billing & FinOps" },
  { value: "SECURITY_AUTH", label: "Security & Auth" },
  { value: "PRODUCTIVITY", label: "Team Workflows" },
  { value: "GROWTH_CRM", label: "Growth & B2B CRM" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];

export const PRICING_MODELS = [
  { value: "FREE_TIER", label: "Free Tier + Paid" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "PAID_ONLY", label: "Paid (Self-Serve)" },
  { value: "OPEN_SOURCE", label: "Open-Source + Cloud" },
] as const;

export type PricingModel = (typeof PRICING_MODELS)[number]["value"];

export const FUNDING_STAGES = [
  { value: "BOOTSTRAPPED", label: "Bootstrapped" },
  { value: "INDIE_PROFITABLE", label: "Indie Profitable" },
  { value: "SEED_VC", label: "Seed VC" },
  { value: "SERIES_A_PLUS", label: "Series A+" },
] as const;

export type FundingStage = (typeof FUNDING_STAGES)[number]["value"];

export const REVENUE_BANDS = [
  { value: "UNVERIFIED", label: "Not Disclosed" },
  { value: "EARLY_PAYING", label: "Verified Paying Customers" },
  { value: "MRR_1K_10K", label: "Verified $1k–$10k MRR" },
  { value: "MRR_10K_PLUS", label: "Verified $10k+ MRR" },
] as const;

export type RevenueBand = (typeof REVENUE_BANDS)[number]["value"];

export const RECOMMENDATION_OPTIONS = [
  { value: "YES", label: "Recommend for production" },
  { value: "WITH_CAVEATS", label: "Promising, with caveats" },
  { value: "NOT_YET", label: "Not ready yet" },
] as const;

export type RecommendationChoice = (typeof RECOMMENDATION_OPTIONS)[number]["value"];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.value, c.label])
);

export const PRICING_LABELS: Record<string, string> = Object.fromEntries(
  PRICING_MODELS.map((p) => [p.value, p.label])
);

export const FUNDING_LABELS: Record<string, string> = Object.fromEntries(
  FUNDING_STAGES.map((f) => [f.value, f.label])
);

export const REVENUE_LABELS: Record<string, string> = Object.fromEntries(
  REVENUE_BANDS.map((r) => [r.value, r.label])
);

export const RECOMMENDATION_LABELS: Record<string, string> = Object.fromEntries(
  RECOMMENDATION_OPTIONS.map((r) => [r.value, r.label])
);

export function formatStartingPrice(usd: number): string {
  if (usd <= 0) return "Free";
  return `$${usd}/mo`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

export function formatRelativeDays(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "Unverified";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Verified today";
  if (days === 1) return "Verified 1d ago";
  if (days < 30) return `Verified ${days}d ago`;
  const months = Math.floor(days / 30);
  return `Verified ${months}mo ago`;
}
