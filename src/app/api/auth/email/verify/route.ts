import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  extractWorkDomain,
  hashToken,
  setSessionCookie,
} from "@/lib/auth";
import { slugify } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.redirect(
      new URL("/auth?error=missing_token", request.url)
    );
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailAuthToken.findUnique({
    where: { tokenHash },
  });

  if (
    !record ||
    record.consumedAt ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.redirect(
      new URL("/auth?error=expired_token", request.url)
    );
  }

  await prisma.emailAuthToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const workDomain = extractWorkDomain(record.email);
  const localPart = record.email.split("@")[0] || "member";
  const displayName = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    const baseHandle = slugify(localPart) || "member";
    const suffix = Math.floor(100 + Math.random() * 900);
    user = await prisma.user.create({
      data: {
        email: record.email,
        name: displayName,
        handle: `${baseHandle}-${suffix}`,
        role: "BUYER",
        verifiedIdentityType: workDomain ? "WORK_EMAIL" : "NONE",
        workDomain,
      },
    });
  } else if (workDomain && user.verifiedIdentityType === "NONE") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        verifiedIdentityType: "WORK_EMAIL",
        workDomain,
      },
    });
  }

  await setSessionCookie(user.id);
  return NextResponse.redirect(new URL("/", request.url));
}
