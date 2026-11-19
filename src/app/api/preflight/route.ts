import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runPreflightCheck } from "@/lib/preflight";

const PreflightBodySchema = z.object({
  websiteUrl: z.string().trim().min(1),
  tryNowUrl: z.string().trim().min(1),
  pricingUrl: z.string().trim().min(1),
  githubRepoUrl: z.string().trim().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to run an automated pre-flight check." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = PreflightBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Website, Try-Now, and Pricing URLs are required." },
      { status: 400 }
    );
  }

  const report = await runPreflightCheck(parsed.data);
  return NextResponse.json({ report });
}
