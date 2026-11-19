import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { extractWorkDomain, hashToken, isDevAuthEnabled } from "@/lib/auth";
import { isEmailDeliveryConfigured, sendMagicLinkEmail } from "@/lib/email";

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

  const emailConfigured = isEmailDeliveryConfigured();
  const devAuthEnabled = isDevAuthEnabled();

  if (!emailConfigured && !devAuthEnabled) {
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured yet. Add RESEND_API_KEY (for live emails) or set DEV_AUTH_MODE=true (for instant demo sign-in) in your environment variables.",
      },
      { status: 503 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  const tokenRecord = await prisma.emailAuthToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
    },
  });

  const appUrl = (process.env.APP_URL || request.nextUrl.origin).replace(
    /\/+$/,
    ""
  );
  const verifyUrl = `${appUrl}/api/auth/email/verify?token=${encodeURIComponent(rawToken)}`;

  if (emailConfigured) {
    const sent = await sendMagicLinkEmail({
      to: email,
      verifyUrl,
      workDomain: extractWorkDomain(email),
    });

    if (!sent.ok) {
      await prisma.emailAuthToken.delete({ where: { id: tokenRecord.id } });
      return NextResponse.json(
        {
          error: `Could not send verification email: ${sent.error}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      delivery: "email",
      message: `Sign-in link sent to ${email}. Check your inbox (and spam folder) — the link expires in 20 minutes.`,
    });
  }

  console.info(`[VerifyLaunch Auth] Dev sign-in link for ${email}: ${verifyUrl}`);

  return NextResponse.json({
    ok: true,
    delivery: "dev_preview",
    message:
      "Instant sign-in link generated (DEV_AUTH_MODE=true, no email provider configured).",
    devVerifyUrl: verifyUrl,
  });
}
