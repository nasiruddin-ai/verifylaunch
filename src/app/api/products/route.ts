import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runPreflightCheck } from "@/lib/preflight";
import { evaluateReciprocityEligibility } from "@/lib/reciprocity";
import { calculateProductSignalScore } from "@/lib/ranking";
import { slugify } from "@/lib/constants";

const SubmitProductSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().min(12).max(140),
  description: z.string().trim().min(40).max(1600),
  notForWhom: z.string().trim().min(20).max(500),
  websiteUrl: z.string().trim().url(),
  tryNowUrl: z.string().trim().url(),
  pricingUrl: z.string().trim().url(),
  demoVideoUrl: z.string().trim().url().optional().or(z.literal("")),
  githubRepoUrl: z.string().trim().url().optional().or(z.literal("")),
  category: z.enum([
    "DEV_INFRA",
    "SAAS_OPS",
    "ANALYTICS",
    "BILLING_FINOPS",
    "SECURITY_AUTH",
    "PRODUCTIVITY",
    "GROWTH_CRM",
  ]),
  pricingModel: z.enum(["FREE_TIER", "FREEMIUM", "PAID_ONLY", "OPEN_SOURCE"]),
  startingPriceUsd: z.coerce.number().int().min(0).max(10000),
  noCreditCardTrial: z.boolean().default(true),
  selfHostable: z.boolean().default(false),
  dataExportable: z.boolean().default(true),
  fundingStage: z.enum([
    "BOOTSTRAPPED",
    "INDIE_PROFITABLE",
    "SEED_VC",
    "SERIES_A_PLUS",
  ]),
  revenueBand: z
    .enum(["UNVERIFIED", "EARLY_PAYING", "MRR_1K_10K", "MRR_10K_PLUS"])
    .default("UNVERIFIED"),
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const category = sp.get("category") || undefined;
  const maxPriceParam = sp.get("maxPrice");
  const noCC = sp.get("noCC") === "true";
  const bootstrapped = sp.get("bootstrapped") === "true";
  const selfHost = sp.get("selfHost") === "true";
  const q = sp.get("q")?.trim().toLowerCase() || "";
  const sort = sp.get("sort") || "signal";

  const maxPrice =
    maxPriceParam !== null && maxPriceParam !== "" && !Number.isNaN(Number(maxPriceParam))
      ? Number(maxPriceParam)
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      status: "LIVE",
      ...(category && category !== "ALL" ? { category } : {}),
      ...(maxPrice !== undefined ? { startingPriceUsd: { lte: maxPrice } } : {}),
      ...(noCC ? { noCreditCardTrial: true } : {}),
      ...(bootstrapped
        ? { fundingStage: { in: ["BOOTSTRAPPED", "INDIE_PROFITABLE"] } }
        : {}),
      ...(selfHost ? { selfHostable: true } : {}),
    },
    include: {
      maker: {
        select: { id: true, name: true, handle: true, verifiedIdentityType: true },
      },
      cohort: { select: { slug: true, title: true } },
      teardowns: {
        where: { status: "PUBLISHED" },
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
      _count: {
        select: { bookmarks: true, visits: true },
      },
    },
  });

  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : products;

  const scored = filtered.map((p) => {
    const uniqueTesters = new Set(p.teardowns.map((t) => t.authorId)).size;
    const signalScore = calculateProductSignalScore({
      id: p.id,
      lastVerifiedActiveAt: p.lastVerifiedActiveAt,
      bookmarkCount: p._count.bookmarks,
      uniqueVerifiedTesters: uniqueTesters,
      teardowns: p.teardowns,
    });
    return {
      ...p,
      signalScore,
      teardownCount: p.teardowns.length,
    };
  });

  if (sort === "price") {
    scored.sort((a, b) => a.startingPriceUsd - b.startingPriceUsd);
  } else if (sort === "newest") {
    scored.sort(
      (a, b) =>
        (b.launchedAt?.getTime() ?? b.createdAt.getTime()) -
        (a.launchedAt?.getTime() ?? a.createdAt.getTime())
    );
  } else {
    scored.sort((a, b) => b.signalScore - a.signalScore);
  }

  return NextResponse.json({ products: scored });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before submitting a product." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = SubmitProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Submission failed validation.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Enforce Reciprocal Quality Gate (Editors can bypass for concierge seeding)
  if (user.role !== "EDITOR") {
    const authored = await prisma.teardown.findMany({
      where: { authorId: user.id },
      select: {
        productId: true,
        authorId: true,
        status: true,
        product: { select: { makerId: true } },
      },
    });

    const reciprocity = evaluateReciprocityEligibility(
      user.id,
      authored.map((t) => ({
        productId: t.productId,
        productMakerId: t.product.makerId,
        authorId: t.authorId,
        status: t.status,
      }))
    );

    if (!reciprocity.eligible) {
      return NextResponse.json(
        {
          error: `Complete ${reciprocity.remaining} more verified peer teardown${
            reciprocity.remaining === 1 ? "" : "s"
          } on another maker's product before submitting to the free weekly cohort.`,
          reciprocity,
        },
        { status: 403 }
      );
    }
  }

  const data = parsed.data;
  const preflightReport = await runPreflightCheck({
    websiteUrl: data.websiteUrl,
    tryNowUrl: data.tryNowUrl,
    pricingUrl: data.pricingUrl,
    githubRepoUrl: data.githubRepoUrl || null,
  });

  if (!preflightReport.passed) {
    return NextResponse.json(
      {
        error:
          "Automated anti-slop pre-flight failed. Fix hard failures (HTTPS / waitlist gate) before submitting.",
        preflightReport,
      },
      { status: 422 }
    );
  }

  const baseSlug = slugify(data.name) || "product";
  const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
  const finalSlug = existing
    ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`
    : baseSlug;

  const initials = data.name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "VL";

  const product = await prisma.product.create({
    data: {
      slug: finalSlug,
      makerId: user.id,
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      notForWhom: data.notForWhom,
      websiteUrl: data.websiteUrl,
      tryNowUrl: data.tryNowUrl,
      pricingUrl: data.pricingUrl,
      demoVideoUrl: data.demoVideoUrl || null,
      githubRepoUrl: data.githubRepoUrl || null,
      logoMark: initials,
      category: data.category,
      pricingModel: data.pricingModel,
      startingPriceUsd: data.startingPriceUsd,
      noCreditCardTrial: data.noCreditCardTrial,
      selfHostable: data.selfHostable,
      dataExportable: data.dataExportable,
      fundingStage: data.fundingStage,
      revenueBand: data.revenueBand,
      status: "SUBMITTED",
      preflightPassed: preflightReport.passed,
      preflightReportJson: JSON.stringify(preflightReport),
      domainVerified: Boolean(
        user.workDomain &&
          new URL(data.websiteUrl).hostname.endsWith(user.workDomain)
      ),
      lastVerifiedActiveAt: new Date(),
    },
  });

  // Upgrade buyer role to MAKER upon first submission if not an editor
  if (user.role === "BUYER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "MAKER" },
    });
  }

  return NextResponse.json({ product, preflightReport }, { status: 201 });
}
