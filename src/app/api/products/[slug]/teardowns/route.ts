import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateTeardownWeight } from "@/lib/ranking";

const TeardownSchema = z.object({
  useCaseTested: z
    .string()
    .trim()
    .min(20, "Describe the concrete workflow you tested (at least 20 characters).")
    .max(600),
  strongestFeature: z
    .string()
    .trim()
    .min(20, "Explain what genuinely worked well (at least 20 characters).")
    .max(600),
  missingOrFriction: z
    .string()
    .trim()
    .min(20, "Note at least one real friction point or missing capability (20+ chars).")
    .max(600),
  wouldRecommend: z.enum(["YES", "WITH_CAVEATS", "NOT_YET"]),
  timeSpentMinutes: z.coerce.number().int().min(5).max(240),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to publish a verified teardown." },
      { status: 401 }
    );
  }

  const { slug } = await context.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, makerId: true, status: true },
  });

  if (!product || product.status !== "LIVE") {
    return NextResponse.json(
      { error: "Live product not found." },
      { status: 404 }
    );
  }

  if (product.makerId === user.id) {
    return NextResponse.json(
      { error: "Makers cannot publish a teardown of their own product." },
      { status: 403 }
    );
  }

  // Enforce Click-Before-Teardown Gate
  const verifiedVisit = await prisma.productVisit.findFirst({
    where: {
      productId: product.id,
      userId: user.id,
      clickedTryNow: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verifiedVisit) {
    return NextResponse.json(
      {
        error:
          "Open and test the live product via the tracked 'Open & Test Product' link before publishing a verified teardown.",
        code: "VISIT_REQUIRED",
      },
      { status: 403 }
    );
  }

  const existing = await prisma.teardown.findUnique({
    where: {
      productId_authorId: {
        productId: product.id,
        authorId: user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already published a verified teardown for this product." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = TeardownSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fill out all structured teardown fields with concrete testing details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const identityBadgeSnapshot =
    user.verifiedIdentityType === "GITHUB"
      ? "GITHUB"
      : user.verifiedIdentityType === "WORK_EMAIL"
      ? "WORK_EMAIL"
      : "MEMBER";

  const qualityWeight = calculateTeardownWeight({
    identityBadgeSnapshot,
    wouldRecommend: parsed.data.wouldRecommend,
    useCaseTested: parsed.data.useCaseTested,
    strongestFeature: parsed.data.strongestFeature,
    missingOrFriction: parsed.data.missingOrFriction,
    timeSpentMinutes: parsed.data.timeSpentMinutes,
  });

  const teardown = await prisma.teardown.create({
    data: {
      productId: product.id,
      authorId: user.id,
      visitId: verifiedVisit.id,
      useCaseTested: parsed.data.useCaseTested,
      strongestFeature: parsed.data.strongestFeature,
      missingOrFriction: parsed.data.missingOrFriction,
      wouldRecommend: parsed.data.wouldRecommend,
      timeSpentMinutes: parsed.data.timeSpentMinutes,
      identityBadgeSnapshot,
      qualityWeight,
      status: "PUBLISHED",
    },
    include: {
      author: {
        select: {
          name: true,
          handle: true,
          githubUsername: true,
          workDomain: true,
          verifiedIdentityType: true,
        },
      },
    },
  });

  return NextResponse.json({ teardown }, { status: 201 });
}
