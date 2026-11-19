import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to bookmark products." },
      { status: 401 }
    );
  }

  const { slug } = await context.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const existing = await prisma.bookmark.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  });

  let bookmarked: boolean;
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    bookmarked = false;
  } else {
    await prisma.bookmark.create({
      data: { userId: user.id, productId: product.id },
    });
    bookmarked = true;
  }

  const count = await prisma.bookmark.count({
    where: { productId: product.id },
  });

  return NextResponse.json({ bookmarked, count });
}
