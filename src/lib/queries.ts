import { prisma } from "@/lib/db";
import {
  calculateProductSignalScore,
  deterministicCohortShuffle,
  isCohortRandomized,
} from "@/lib/ranking";

export interface EnrichedProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  notForWhom: string;
  websiteUrl: string;
  tryNowUrl: string;
  pricingUrl: string;
  demoVideoUrl: string | null;
  logoMark: string;
  category: string;
  pricingModel: string;
  startingPriceUsd: number;
  noCreditCardTrial: boolean;
  selfHostable: boolean;
  dataExportable: boolean;
  fundingStage: string;
  status: string;
  preflightPassed: boolean;
  preflightReportJson: string | null;
  githubRepoUrl: string | null;
  githubLastCommitAt: Date | null;
  domainVerified: boolean;
  revenueBand: string;
  lastVerifiedActiveAt: Date | null;
  launchedAt: Date | null;
  maker: {
    id: string;
    name: string;
    handle: string;
    verifiedIdentityType: string;
    githubUsername: string | null;
    workDomain: string | null;
  };
  cohort: {
    id: string;
    slug: string;
    title: string;
    status: string;
  } | null;
  teardownCount: number;
  recommendCount: number;
  topFriction: string | null;
  bookmarkCount: number;
  qualifiedClickCount: number;
  signalScore: number;
  isBookmarked: boolean;
}

export async function getCohortDropData(options: {
  cohortSlug?: string;
  viewerUserId?: string | null;
  viewerSeed: string;
}) {
  const cohort = options.cohortSlug
    ? await prisma.cohort.findUnique({ where: { slug: options.cohortSlug } })
    : await prisma.cohort.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startsAt: "desc" },
      });

  const allCohorts = await prisma.cohort.findMany({
    where: { status: { in: ["ACTIVE", "ARCHIVED"] } },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { products: { where: { status: "LIVE" } } } },
    },
  });

  if (!cohort) {
    return {
      cohort: null,
      allCohorts,
      products: [] as EnrichedProduct[],
      randomized: false,
    };
  }

  const rawProducts = await prisma.product.findMany({
    where: { cohortId: cohort.id, status: "LIVE" },
    include: {
      maker: {
        select: {
          id: true,
          name: true,
          handle: true,
          verifiedIdentityType: true,
          githubUsername: true,
          workDomain: true,
        },
      },
      cohort: {
        select: { id: true, slug: true, title: true, status: true },
      },
      teardowns: {
        where: { status: "PUBLISHED" },
        orderBy: { qualityWeight: "desc" },
        select: {
          authorId: true,
          identityBadgeSnapshot: true,
          wouldRecommend: true,
          useCaseTested: true,
          strongestFeature: true,
          missingOrFriction: true,
          timeSpentMinutes: true,
          status: true,
        },
      },
      bookmarks: options.viewerUserId
        ? { where: { userId: options.viewerUserId }, select: { id: true } }
        : false,
      _count: {
        select: { bookmarks: true, visits: true },
      },
    },
  });

  const now = new Date();
  const enriched: EnrichedProduct[] = rawProducts.map((p) => {
    const uniqueTesters = new Set(p.teardowns.map((t) => t.authorId)).size;
    const signalScore = calculateProductSignalScore(
      {
        id: p.id,
        lastVerifiedActiveAt: p.lastVerifiedActiveAt,
        bookmarkCount: p._count.bookmarks,
        uniqueVerifiedTesters: uniqueTesters,
        teardowns: p.teardowns,
      },
      now
    );
    const recommendCount = p.teardowns.filter(
      (t) => t.wouldRecommend === "YES"
    ).length;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      notForWhom: p.notForWhom,
      websiteUrl: p.websiteUrl,
      tryNowUrl: p.tryNowUrl,
      pricingUrl: p.pricingUrl,
      demoVideoUrl: p.demoVideoUrl,
      logoMark: p.logoMark,
      category: p.category,
      pricingModel: p.pricingModel,
      startingPriceUsd: p.startingPriceUsd,
      noCreditCardTrial: p.noCreditCardTrial,
      selfHostable: p.selfHostable,
      dataExportable: p.dataExportable,
      fundingStage: p.fundingStage,
      status: p.status,
      preflightPassed: p.preflightPassed,
      preflightReportJson: p.preflightReportJson,
      githubRepoUrl: p.githubRepoUrl,
      githubLastCommitAt: p.githubLastCommitAt,
      domainVerified: p.domainVerified,
      revenueBand: p.revenueBand,
      lastVerifiedActiveAt: p.lastVerifiedActiveAt,
      launchedAt: p.launchedAt,
      maker: p.maker,
      cohort: p.cohort,
      teardownCount: p.teardowns.length,
      recommendCount,
      topFriction: p.teardowns[0]?.missingOrFriction ?? null,
      bookmarkCount: p._count.bookmarks,
      qualifiedClickCount: p._count.visits,
      signalScore,
      isBookmarked: Array.isArray(p.bookmarks) && p.bookmarks.length > 0,
    };
  });

  const randomized =
    cohort.status === "ACTIVE" && isCohortRandomized(cohort.randomizeUntil, now);

  const ordered = randomized
    ? deterministicCohortShuffle(enriched, `${cohort.id}:${options.viewerSeed}`)
    : [...enriched].sort((a, b) => b.signalScore - a.signalScore);

  return {
    cohort,
    allCohorts,
    products: ordered,
    randomized,
  };
}

export async function getDirectoryProducts(filters: {
  category?: string;
  maxPrice?: number;
  noCC?: boolean;
  bootstrapped?: boolean;
  selfHost?: boolean;
  q?: string;
  sort?: string;
  viewerUserId?: string | null;
}) {
  const rawProducts = await prisma.product.findMany({
    where: {
      status: "LIVE",
      ...(filters.category && filters.category !== "ALL"
        ? { category: filters.category }
        : {}),
      ...(filters.maxPrice !== undefined
        ? { startingPriceUsd: { lte: filters.maxPrice } }
        : {}),
      ...(filters.noCC ? { noCreditCardTrial: true } : {}),
      ...(filters.bootstrapped
        ? { fundingStage: { in: ["BOOTSTRAPPED", "INDIE_PROFITABLE"] } }
        : {}),
      ...(filters.selfHost ? { selfHostable: true } : {}),
    },
    include: {
      maker: {
        select: {
          id: true,
          name: true,
          handle: true,
          verifiedIdentityType: true,
          githubUsername: true,
          workDomain: true,
        },
      },
      cohort: { select: { id: true, slug: true, title: true, status: true } },
      teardowns: {
        where: { status: "PUBLISHED" },
        orderBy: { qualityWeight: "desc" },
        select: {
          authorId: true,
          identityBadgeSnapshot: true,
          wouldRecommend: true,
          useCaseTested: true,
          strongestFeature: true,
          missingOrFriction: true,
          timeSpentMinutes: true,
          status: true,
        },
      },
      bookmarks: filters.viewerUserId
        ? { where: { userId: filters.viewerUserId }, select: { id: true } }
        : false,
      _count: { select: { bookmarks: true, visits: true } },
    },
  });

  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = query
    ? rawProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.tagline.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.notForWhom.toLowerCase().includes(query)
      )
    : rawProducts;

  const now = new Date();
  const enriched: EnrichedProduct[] = filtered.map((p) => {
    const uniqueTesters = new Set(p.teardowns.map((t) => t.authorId)).size;
    const signalScore = calculateProductSignalScore(
      {
        id: p.id,
        lastVerifiedActiveAt: p.lastVerifiedActiveAt,
        bookmarkCount: p._count.bookmarks,
        uniqueVerifiedTesters: uniqueTesters,
        teardowns: p.teardowns,
      },
      now
    );

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      notForWhom: p.notForWhom,
      websiteUrl: p.websiteUrl,
      tryNowUrl: p.tryNowUrl,
      pricingUrl: p.pricingUrl,
      demoVideoUrl: p.demoVideoUrl,
      logoMark: p.logoMark,
      category: p.category,
      pricingModel: p.pricingModel,
      startingPriceUsd: p.startingPriceUsd,
      noCreditCardTrial: p.noCreditCardTrial,
      selfHostable: p.selfHostable,
      dataExportable: p.dataExportable,
      fundingStage: p.fundingStage,
      status: p.status,
      preflightPassed: p.preflightPassed,
      preflightReportJson: p.preflightReportJson,
      githubRepoUrl: p.githubRepoUrl,
      githubLastCommitAt: p.githubLastCommitAt,
      domainVerified: p.domainVerified,
      revenueBand: p.revenueBand,
      lastVerifiedActiveAt: p.lastVerifiedActiveAt,
      launchedAt: p.launchedAt,
      maker: p.maker,
      cohort: p.cohort,
      teardownCount: p.teardowns.length,
      recommendCount: p.teardowns.filter((t) => t.wouldRecommend === "YES").length,
      topFriction: p.teardowns[0]?.missingOrFriction ?? null,
      bookmarkCount: p._count.bookmarks,
      qualifiedClickCount: p._count.visits,
      signalScore,
      isBookmarked: Array.isArray(p.bookmarks) && p.bookmarks.length > 0,
    };
  });

  if (filters.sort === "price") {
    enriched.sort((a, b) => a.startingPriceUsd - b.startingPriceUsd);
  } else if (filters.sort === "newest") {
    enriched.sort(
      (a, b) =>
        (b.launchedAt?.getTime() ?? 0) - (a.launchedAt?.getTime() ?? 0)
    );
  } else {
    enriched.sort((a, b) => b.signalScore - a.signalScore);
  }

  return enriched;
}
