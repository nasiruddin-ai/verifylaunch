import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, tryNowUrl: true, status: true },
  });

  if (!product) {
    return NextResponse.redirect(new URL("/directory", request.url));
  }

  const user = await getCurrentUser();
  const ua = request.headers.get("user-agent") || "unknown";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const sessionHash = crypto
    .createHash("sha256")
    .update(`${user?.id ?? ip}:${ua}:${new Date().toISOString().slice(0, 10)}`)
    .digest("hex")
    .slice(0, 24);

  const referrer =
    request.nextUrl.searchParams.get("ref") ||
    request.headers.get("referer") ||
    "direct";

  await prisma.productVisit.create({
    data: {
      productId: product.id,
      userId: user?.id ?? null,
      sessionHash,
      clickedTryNow: true,
      referrer: referrer.slice(0, 120),
    },
  });

  const response = NextResponse.redirect(product.tryNowUrl, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
