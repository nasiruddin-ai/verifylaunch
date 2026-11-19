import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/constants";

const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
  role: z.enum(["BUYER", "MAKER"]).default("BUYER"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid input.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "An account with this email already exists. Switch to Sign In instead.",
      },
      { status: 409 }
    );
  }

  const baseHandle =
    slugify(parsed.data.name) || slugify(email.split("@")[0] || "member") || "member";
  let handle = baseHandle;
  const handleTaken = await prisma.user.findUnique({ where: { handle } });
  if (handleTaken) {
    handle = `${baseHandle}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(parsed.data.password),
      name: parsed.data.name,
      handle,
      role: parsed.data.role,
      verifiedIdentityType: "NONE",
    },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      role: true,
      verifiedIdentityType: true,
    },
  });

  await setSessionCookie(user.id);

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
