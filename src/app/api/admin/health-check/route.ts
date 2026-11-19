import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runPreflightCheck } from "@/lib/preflight";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EDITOR") {
    return NextResponse.json(
      { error: "Editorial reviewer access required." },
      { status: 403 }
    );
  }

  const liveProducts = await prisma.product.findMany({
    where: { status: "LIVE" },
    select: {
      id: true,
      slug: true,
      name: true,
      websiteUrl: true,
      tryNowUrl: true,
      pricingUrl: true,
      githubRepoUrl: true,
    },
  });

  const results: Array<{ slug: string; name: string; passed: boolean }> = [];
  const checkedAt = new Date();

  for (const product of liveProducts) {
    const report = await runPreflightCheck(
      {
        websiteUrl: product.websiteUrl,
        tryNowUrl: product.tryNowUrl,
        pricingUrl: product.pricingUrl,
        githubRepoUrl: product.githubRepoUrl,
      },
      { timeoutMs: 2500 }
    );

    await prisma.product.update({
      where: { id: product.id },
      data: {
        preflightPassed: report.passed,
        preflightReportJson: JSON.stringify(report),
        ...(report.passed ? { lastVerifiedActiveAt: checkedAt } : {}),
      },
    });

    results.push({
      slug: product.slug,
      name: product.name,
      passed: report.passed,
    });
  }

  return NextResponse.json({
    ok: true,
    checkedCount: results.length,
    checkedAt: checkedAt.toISOString(),
    results,
  });
}
