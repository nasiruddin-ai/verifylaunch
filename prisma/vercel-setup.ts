import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

async function main() {
  const runtimeUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "";

  const migrationUrl =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    runtimeUrl;

  if (!isPostgresUrl(migrationUrl)) {
    console.log(
      "[VerifyLaunch] Skipping automatic Postgres schema push: no PostgreSQL connection string found (DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL)."
    );
    return;
  }

  const dbEnv = { ...process.env, DATABASE_URL: migrationUrl };

  console.log("[VerifyLaunch] Pushing Prisma schema to PostgreSQL...");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: dbEnv,
  });

  const prisma = new PrismaClient({
    datasources: { db: { url: migrationUrl } },
  });
  try {
    const existingCohorts = await prisma.cohort.count();
    if (existingCohorts === 0) {
      console.log(
        "[VerifyLaunch] Empty database detected — seeding initial VerifyLaunch cohorts & personas..."
      );
      execSync("npx tsx prisma/seed.ts", {
        stdio: "inherit",
        env: dbEnv,
      });
    } else {
      console.log(
        `[VerifyLaunch] Database already initialized (${existingCohorts} cohorts found) — skipping seed.`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[VerifyLaunch] Vercel DB setup failed:", err);
  process.exit(1);
});
