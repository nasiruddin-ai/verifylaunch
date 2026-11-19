import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isDevAuthEnabled, setSessionCookie } from "@/lib/auth";

const DevLoginSchema = z.object({
  persona: z.enum(["BUYER", "MAKER", "EDITOR"]),
});

const PERSONA_EMAILS: Record<"BUYER" | "MAKER" | "EDITOR", string> = {
  BUYER: "alex@acme-ops.io",
  MAKER: "maya@bootstrapped.dev",
  EDITOR: "editor@verifylaunch.dev",
};

export async function POST(request: NextRequest) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json(
      { error: "Local dev persona auth is disabled in this environment." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = DevLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid persona selection" },
      { status: 400 }
    );
  }

  const email = PERSONA_EMAILS[parsed.data.persona];
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: `Seeded ${parsed.data.persona} user not found. Run npm run db:seed.` },
      { status: 404 }
    );
  }

  await setSessionCookie(user.id);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verifiedIdentityType: user.verifiedIdentityType,
    },
  });
}
