import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken, isDevAuthEnabled } from "@/lib/auth";

const RequestSchema = z.object({
  email: z.string().trim().email().max(180),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  await prisma.emailAuthToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
    },
  });

  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const verifyUrl = `${appUrl}/api/auth/email/verify?token=${encodeURIComponent(rawToken)}`;

  console.info(`[VerifyLaunch Auth] Sign-in link for ${email}: ${verifyUrl}`);

  return NextResponse.json({
    ok: true,
    message:
      "Verification link generated. Check your inbox (or use the local preview link in dev mode).",
    ...(isDevAuthEnabled() ? { devVerifyUrl: verifyUrl } : {}),
  });
}
