import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getDirectoryProducts } from "@/lib/queries";
import { DirectoryFilters } from "@/components/DirectoryFilters";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Verified Directory",
  description:
    "Filter live, transparently priced bootstrapped B2B SaaS and developer tools by starting price, No-CC trial, self-hosting, and verified teardowns.",
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const getOne = (key: string) => {
    const val = sp[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const category = getOne("category");
  const maxPriceRaw = getOne("maxPrice");
  const maxPrice =
    maxPriceRaw !== undefined && maxPriceRaw !== "" && !Number.isNaN(Number(maxPriceRaw))
      ? Number(maxPriceRaw)
      : undefined;
  const noCC = getOne("noCC") === "true";
  const bootstrapped = getOne("bootstrapped") === "true";
  const selfHost = getOne("selfHost") === "true";
  const q = getOne("q") ?? "";
  const sort = getOne("sort") ?? "signal";

  const user = await getCurrentUser();
  const products = await getDirectoryProducts({
    category,
    maxPrice,
    noCC,
    bootstrapped,
    selfHost,
    q,
    sort,
    viewerUserId: user?.id ?? null,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-verified">
          Buyer-First Software Ledger
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Verified Directory
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Every listing is continuously checked for live availability and
          transparent pricing—filter by real buying constraints rather than
          launch-day hype.
        </p>
      </header>

      <DirectoryFilters />

      <div className="mt-6">
        <p className="mb-3 font-mono text-xs text-ink-muted tabular">
          Showing {products.length} verified{" "}
          {products.length === 1 ? "tool" : "tools"}
        </p>

        {products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                rankIndex={index}
                randomized={false}
                signedIn={Boolean(user)}
              />
            ))}
          </div>
        ) : (
          <div className="editorial-card p-10 text-center">
            <h2 className="font-serif text-xl text-ink">
              No verified products match these constraints
            </h2>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Try loosening your price cap or resetting one of the toggle
              filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
