import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  password: z.string().min(1, "Please enter your password.").max(128),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid credentials.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      role: true,
      verifiedIdentityType: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  await setSessionCookie(user.id);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      handle: user.handle,
      role: user.role,
      verifiedIdentityType: user.verifiedIdentityType,
    },
  });
}
