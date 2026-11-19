import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ReviewDecisionSchema = z.object({
  productId: z.string().min(1),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  cohortId: z.string().optional().nullable(),
  feedback: z.string().trim().min(10, "Provide clear editorial feedback (10+ chars).").max(800),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "EDITOR") {
    return NextResponse.json(
      { error: "Editorial reviewer access required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = ReviewDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid editorial decision payload.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { productId, decision, cohortId, feedback } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let nextStatus: string = decision;
  let assignedCohortId: string | null = product.cohortId;
  let launchedAt: Date | null = product.launchedAt;

  if (decision === "APPROVED") {
    if (!cohortId) {
      return NextResponse.json(
        { error: "Select a weekly cohort when approving a product." },
        { status: 400 }
      );
    }

    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        _count: { select: { products: { where: { status: { in: ["APPROVED", "LIVE"] } } } } },
      },
    });

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
    }

    if (cohort._count.products >= cohort.maxSlots && product.cohortId !== cohort.id) {
      return NextResponse.json(
        { error: `${cohort.title} is already full (${cohort.maxSlots}/${cohort.maxSlots} slots).` },
        { status: 409 }
      );
    }

    assignedCohortId = cohort.id;
    nextStatus = cohort.status === "ACTIVE" ? "LIVE" : "APPROVED";
    if (cohort.status === "ACTIVE") {
      launchedAt = new Date();
    }
  }

  const [updatedProduct, reviewAction] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        status: nextStatus,
        cohortId: assignedCohortId,
        editorNotes: feedback,
        launchedAt,
        lastVerifiedActiveAt: decision === "APPROVED" ? new Date() : product.lastVerifiedActiveAt,
      },
    }),
    prisma.reviewAction.create({
      data: {
        productId,
        editorId: user.id,
        cohortId: assignedCohortId,
        decision,
        feedback,
      },
    }),
  ]);

  return NextResponse.json({ product: updatedProduct, reviewAction });
}
