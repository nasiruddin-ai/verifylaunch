import { PrismaClient } from "@prisma/client";
import { calculateTeardownWeight } from "../src/lib/ranking";

const prisma = new PrismaClient();

function makePreflightJson(opts: {
  passed: boolean;
  httpStatus: number;
  responseTimeMs: number;
  pricingReachable: boolean;
  waitlistSuspected: boolean;
  githubActiveWithin90d: boolean | null;
  checkedAt: string;
}) {
  return JSON.stringify({
    ...opts,
    checks: [
      {
        id: "url_hygiene",
        label: "Public HTTPS product & try-now URLs",
        status: "pass",
        detail: "Validated public HTTPS domain and live entry path.",
      },
      {
        id: "live_probe",
        label: "Live product reachability",
        status: opts.httpStatus >= 200 && opts.httpStatus < 400 ? "pass" : "fail",
        detail: `HTTP ${opts.httpStatus} in ${opts.responseTimeMs}ms.`,
      },
      {
        id: "waitlist_scan",
        label: "Usable today (anti-waitlist scan)",
        status: opts.waitlistSuspected ? "fail" : "pass",
        detail: opts.waitlistSuspected
          ? "Detected waitlist/coming-soon phrasing without live app entry cues."
          : "No waitlist-only gate detected on entry page.",
      },
      {
        id: "pricing_probe",
        label: "Public transparent pricing page",
        status: opts.pricingReachable ? "pass" : "fail",
        detail: opts.pricingReachable
          ? "Pricing page reachable (HTTP 200)."
          : "Pricing page unavailable or gated behind demo form.",
      },
      ...(opts.githubActiveWithin90d !== null
        ? [
            {
              id: "github_repo",
              label: "GitHub repository freshness",
              status: opts.githubActiveWithin90d ? "pass" : "warn",
              detail: opts.githubActiveWithin90d
                ? "Active commits verified within last 14 days."
                : "Last public commit older than 90 days.",
            },
          ]
        : []),
    ],
  });
}

async function main() {
  console.log("Seeding VerifyLaunch database...");

  // Clean tables in dependency order for idempotent re-seeding
  await prisma.reviewAction.deleteMany();
  await prisma.teardown.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.productVisit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.emailAuthToken.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3600_000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400_000);

  // 1. Users (3 switchable dev personas + 4 verified scouts/makers)
  const [
    buyerPersona,
    makerPersona,
    editorPersona,
    scoutHannah,
    scoutDevon,
    makerLiam,
    makerPriya,
  ] = await Promise.all([
    prisma.user.create({
      data: {
        email: "alex@acme-ops.io",
        name: "Alex Rivera",
        handle: "alexrivera",
        role: "BUYER",
        verifiedIdentityType: "WORK_EMAIL",
        workDomain: "acme-ops.io",
        bio: "Head of Operations evaluating bootstrapped B2B infrastructure & billing tooling.",
      },
    }),
    prisma.user.create({
      data: {
        email: "maya@bootstrapped.dev",
        name: "Maya Lin",
        handle: "mayalin",
        role: "MAKER",
        verifiedIdentityType: "GITHUB",
        githubUsername: "mayalin-dev",
        workDomain: "bootstrapped.dev",
        bio: "Solo founder building webhook reliability and Postgres observability tools.",
      },
    }),
    prisma.user.create({
      data: {
        email: "editor@verifylaunch.dev",
        name: "Samir Patel",
        handle: "samir_editor",
        role: "EDITOR",
        verifiedIdentityType: "WORK_EMAIL",
        workDomain: "verifylaunch.dev",
        bio: "Lead editorial curator vetting weekly cohorts and testing every submission live.",
      },
    }),
    prisma.user.create({
      data: {
        email: "hannah@northstarcloud.io",
        name: "Hannah Novak",
        handle: "hnovak",
        role: "BUYER",
        verifiedIdentityType: "GITHUB",
        githubUsername: "hnovak-sre",
        workDomain: "northstarcloud.io",
        bio: "Staff SRE & open-source maintainer testing self-hostable developer tools.",
      },
    }),
    prisma.user.create({
      data: {
        email: "devon@kineticfin.co",
        name: "Devon Brooks",
        handle: "dbrooks",
        role: "BUYER",
        verifiedIdentityType: "WORK_EMAIL",
        workDomain: "kineticfin.co",
        bio: "VP Finance & Ops at a 35-person B2B SaaS. Allergic to 'Book a Demo' walls.",
      },
    }),
    prisma.user.create({
      data: {
        email: "liam@querysmith.io",
        name: "Liam O'Connor",
        handle: "liamoc",
        role: "MAKER",
        verifiedIdentityType: "GITHUB",
        githubUsername: "liam-querysmith",
        workDomain: "querysmith.io",
        bio: "Bootstrapped founder building developer-first SQL & data tools.",
      },
    }),
    prisma.user.create({
      data: {
        email: "priya@churnledger.com",
        name: "Priya Nair",
        handle: "priyanair",
        role: "MAKER",
        verifiedIdentityType: "WORK_EMAIL",
        workDomain: "churnledger.com",
        bio: "Ex-billing engineer building transparent revenue recovery for indie SaaS.",
      },
    }),
  ]);

  // 2. Cohorts (Active Weekly Drop + Archived Past Drop + Upcoming Drop)
  const activeCohort = await prisma.cohort.create({
    data: {
      slug: "2026-w47",
      title: "Week 47 Drop — B2B Ops & Dev Infra",
      summary:
        "Six hand-tested bootstrapped tools with transparent pricing, live sandboxes, and zero waitlists. Display order is randomized for the first 48 hours to neutralize timezone and network bias.",
      startsAt: daysAgo(1),
      endsAt: daysFromNow(6),
      // Set 20 hours in the future so the 48h randomization notice is active out of the box
      randomizeUntil: hoursFromNow(20),
      maxSlots: 8,
      status: "ACTIVE",
    },
  });

  const archivedCohort = await prisma.cohort.create({
    data: {
      slug: "2026-w43",
      title: "Week 43 Drop — October Archive",
      summary:
        "Past cohort verified active at the 30-day checkpoint. Ranked strictly by weighted verified teardowns and post-launch freshness.",
      startsAt: daysAgo(30),
      endsAt: daysAgo(23),
      randomizeUntil: daysAgo(28),
      maxSlots: 8,
      status: "ARCHIVED",
    },
  });

  await prisma.cohort.create({
    data: {
      slug: "2026-w48",
      title: "Week 48 Drop — Next Tuesday",
      summary: "Upcoming curated cohort currently accepting vetted submissions.",
      startsAt: daysFromNow(6),
      endsAt: daysFromNow(13),
      randomizeUntil: daysFromNow(8),
      maxSlots: 8,
      status: "UPCOMING",
    },
  });

  // 3. Active Cohort Products (6 vetted bootstrapped B2B / Dev tools)
  const activeProductsData = [
    {
      slug: "hookvault",
      makerId: makerPersona.id,
      cohortId: activeCohort.id,
      name: "HookVault",
      tagline: "Dead-letter queue, payload inspector, and 1-click replay for Stripe & GitHub webhooks.",
      description:
        "HookVault sits in front of your webhook endpoints so deploys or third-party outages never silently drop billing events. Inspect raw headers, diff payload schemas across versions, and replay failed batches directly against local or production URLs.",
      notForWhom:
        "Not for teams needing a full Kafka/EventBridge streaming mesh or enterprise HIPAA BAAs. Built for 1–25 person SaaS teams running HTTP webhooks.",
      websiteUrl: "https://hookvault.dev",
      tryNowUrl: "https://hookvault.dev/sandbox",
      pricingUrl: "https://hookvault.dev/pricing",
      demoVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      logoMark: "HV",
      category: "DEV_INFRA",
      pricingModel: "FREE_TIER",
      startingPriceUsd: 19,
      noCreditCardTrial: true,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 142,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: "https://github.com/mayalin-dev/hookvault-cli",
      githubLastCommitAt: daysAgo(2),
      domainVerified: true,
      revenueBand: "MRR_1K_10K",
      lastVerifiedActiveAt: daysAgo(0),
      launchedAt: daysAgo(1),
    },
    {
      slug: "churnledger",
      makerId: makerPriya.id,
      cohortId: activeCohort.id,
      name: "ChurnLedger",
      tagline: "Automated failed-payment dunning and cohort MRR audit built for Stripe & Paddle.",
      description:
        "Connect a read-only Stripe or Paddle key in 90 seconds to surface involuntary churn leaks, card expiry risk, and plain-text dunning sequences that convert without looking like spam. Zero percentage-of-revenue tax.",
      notForWhom:
        "Not for usage-based enterprise contracts invoiced manually via Net-60 wire transfers or Salesforce CPQ workflows.",
      websiteUrl: "https://churnledger.com",
      tryNowUrl: "https://app.churnledger.com/demo",
      pricingUrl: "https://churnledger.com/pricing",
      demoVideoUrl: null,
      logoMark: "CL",
      category: "BILLING_FINOPS",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 39,
      noCreditCardTrial: true,
      selfHostable: false,
      dataExportable: true,
      fundingStage: "INDIE_PROFITABLE",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 188,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: true,
      revenueBand: "MRR_10K_PLUS",
      lastVerifiedActiveAt: daysAgo(1),
      launchedAt: daysAgo(1),
    },
    {
      slug: "pgpulse",
      makerId: makerLiam.id,
      cohortId: activeCohort.id,
      name: "PgPulse",
      tagline: "Lightweight Postgres slow-query profiler and index advisor without Datadog pricing.",
      description:
        "Drop a single read-only sidecar agent next to Postgres to capture pg_stat_statements diffs, lock contention spikes, and unused index bloat. Flat per-cluster pricing with full SQL export.",
      notForWhom:
        "Not for MySQL, MongoDB, or full distributed APM tracing across microservices. Strictly focused on PostgreSQL 14+.",
      websiteUrl: "https://pgpulse.io",
      tryNowUrl: "https://play.pgpulse.io",
      pricingUrl: "https://pgpulse.io/pricing",
      demoVideoUrl: null,
      logoMark: "PG",
      category: "DEV_INFRA",
      pricingModel: "OPEN_SOURCE",
      startingPriceUsd: 0,
      noCreditCardTrial: true,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 118,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: "https://github.com/liam-querysmith/pgpulse",
      githubLastCommitAt: daysAgo(3),
      domainVerified: true,
      revenueBand: "EARLY_PAYING",
      lastVerifiedActiveAt: daysAgo(0),
      launchedAt: daysAgo(1),
    },
    {
      slug: "clearscope-desk",
      makerId: makerPriya.id,
      cohortId: activeCohort.id,
      name: "RelayDesk",
      tagline: "Shared customer support inbox that lives inside Linear and Slack—no per-seat bloat.",
      description:
        "Turn support emails and in-app bug reports directly into triaged Linear issues while keeping customer replies synchronized in one clean thread. Flat team pricing instead of $99/seat helpdesk tolls.",
      notForWhom:
        "Not for call centers needing IVR phone trees, complex multi-brand SLAs, or 50+ tiered support agents.",
      websiteUrl: "https://relaydesk.app",
      tryNowUrl: "https://relaydesk.app/try",
      pricingUrl: "https://relaydesk.app/pricing",
      demoVideoUrl: null,
      logoMark: "RD",
      category: "SAAS_OPS",
      pricingModel: "FREEMIUM",
      startingPriceUsd: 29,
      noCreditCardTrial: true,
      selfHostable: false,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 215,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: true,
      revenueBand: "MRR_1K_10K",
      lastVerifiedActiveAt: daysAgo(1),
      launchedAt: daysAgo(1),
    },
    {
      slug: "keyguard-audit",
      makerId: makerLiam.id,
      cohortId: activeCohort.id,
      name: "KeyGuard Audit",
      tagline: "Continuous API key leak, OAuth scope creep, and SOC2 evidence checks for small SaaS.",
      description:
        "Monitors your GitHub org, Vercel/Cloudflare env vars, and Stripe restricted keys for over-privileged tokens and expiring secrets, exporting auditor-ready CSV/JSON evidence bundles in one click.",
      notForWhom:
        "Not a full GRC platform replacement for Vanta or Drata if you need automated HRIS onboarding and vendor questionnaires.",
      websiteUrl: "https://keyguardaudit.com",
      tryNowUrl: "https://app.keyguardaudit.com/sandbox",
      pricingUrl: "https://keyguardaudit.com/pricing",
      demoVideoUrl: null,
      logoMark: "KG",
      category: "SECURITY_AUTH",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 49,
      noCreditCardTrial: false,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "SEED_VC",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 260,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: "https://github.com/liam-querysmith/keyguard-scanner",
      githubLastCommitAt: daysAgo(5),
      domainVerified: true,
      revenueBand: "EARLY_PAYING",
      lastVerifiedActiveAt: daysAgo(2),
      launchedAt: daysAgo(1),
    },
    {
      slug: "funneltrace",
      makerId: makerPriya.id,
      cohortId: activeCohort.id,
      name: "FunnelTrace",
      tagline: "Cookieless B2B attribution linking content, referrals, and Stripe revenue without GA4.",
      description:
        "Lightweight 2KB script + Stripe webhook join that shows which specific blog posts, subreddits, and referral links produce 30-day retained paying customers—not just anonymous pageviews.",
      notForWhom:
        "Not for mobile consumer apps needing Meta/TikTok ad-network SKAdNetwork attribution or multi-touch enterprise ABM.",
      websiteUrl: "https://funneltrace.io",
      tryNowUrl: "https://funneltrace.io/live-demo",
      pricingUrl: "https://funneltrace.io/pricing",
      demoVideoUrl: null,
      logoMark: "FT",
      category: "ANALYTICS",
      pricingModel: "FREE_TIER",
      startingPriceUsd: 15,
      noCreditCardTrial: true,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "INDIE_PROFITABLE",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 130,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(1).toISOString(),
      }),
      githubRepoUrl: "https://github.com/priyanair/funneltrace-js",
      githubLastCommitAt: daysAgo(4),
      domainVerified: true,
      revenueBand: "MRR_1K_10K",
      lastVerifiedActiveAt: daysAgo(0),
      launchedAt: daysAgo(1),
    },
  ];

  // 4. Archived Past Cohort Products (4 tools with 30-day survival history)
  const archivedProductsData = [
    {
      slug: "cronbrief",
      makerId: makerLiam.id,
      cohortId: archivedCohort.id,
      name: "CronBrief",
      tagline: "Heartbeat monitoring and silent-failure alerts for background jobs and ETL scripts.",
      description:
        "Wrap any cron or queue worker with a single HTTP ping. Get Slack, PagerDuty, or email alerts when a job fails, runs too long, or never starts.",
      notForWhom: "Not a full log aggregator or uptime suite for global synthetic browser testing.",
      websiteUrl: "https://cronbrief.dev",
      tryNowUrl: "https://cronbrief.dev/demo",
      pricingUrl: "https://cronbrief.dev/pricing",
      demoVideoUrl: null,
      logoMark: "CB",
      category: "DEV_INFRA",
      pricingModel: "FREE_TIER",
      startingPriceUsd: 9,
      noCreditCardTrial: true,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "INDIE_PROFITABLE",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 95,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(2).toISOString(),
      }),
      githubRepoUrl: "https://github.com/liam-querysmith/cronbrief",
      githubLastCommitAt: daysAgo(6),
      domainVerified: true,
      revenueBand: "MRR_1K_10K",
      lastVerifiedActiveAt: daysAgo(2),
      launchedAt: daysAgo(30),
    },
    {
      slug: "seatcheck",
      makerId: makerPriya.id,
      cohortId: archivedCohort.id,
      name: "SeatCheck",
      tagline: "Quarterly SaaS spend audit that spots zombie seats across Google Workspace & Slack.",
      description:
        "Connects via read-only OAuth to flag unused software seats and renewal traps before annual auto-renewals hit your corporate card.",
      notForWhom: "Not for 500+ employee enterprises needing procurement approval workflows.",
      websiteUrl: "https://seatcheck.co",
      tryNowUrl: "https://seatcheck.co/sandbox",
      pricingUrl: "https://seatcheck.co/pricing",
      demoVideoUrl: null,
      logoMark: "SC",
      category: "BILLING_FINOPS",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 49,
      noCreditCardTrial: true,
      selfHostable: false,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 174,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(4).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: true,
      revenueBand: "MRR_1K_10K",
      lastVerifiedActiveAt: daysAgo(4),
      launchedAt: daysAgo(30),
    },
    {
      slug: "changelog-kit",
      makerId: makerLiam.id,
      cohortId: archivedCohort.id,
      name: "ChangelogKit",
      tagline: "Git-synced release notes and in-app customer update widget for product teams.",
      description:
        "Write release notes in Markdown inside your repository and publish simultaneously to a hosted changelog, RSS feed, and lightweight embeddable popover.",
      notForWhom: "Not for full public roadmap voting portals with complex CRM weighting.",
      websiteUrl: "https://changelogkit.dev",
      tryNowUrl: "https://changelogkit.dev/preview",
      pricingUrl: "https://changelogkit.dev/pricing",
      demoVideoUrl: null,
      logoMark: "CK",
      category: "GROWTH_CRM",
      pricingModel: "FREEMIUM",
      startingPriceUsd: 19,
      noCreditCardTrial: true,
      selfHostable: true,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 122,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: true,
        checkedAt: daysAgo(5).toISOString(),
      }),
      githubRepoUrl: "https://github.com/liam-querysmith/changelogkit",
      githubLastCommitAt: daysAgo(9),
      domainVerified: true,
      revenueBand: "EARLY_PAYING",
      lastVerifiedActiveAt: daysAgo(5),
      launchedAt: daysAgo(30),
    },
    {
      slug: "asyncstandup",
      makerId: makerPriya.id,
      cohortId: archivedCohort.id,
      name: "AsyncBrief",
      tagline: "Zero-bot async engineering check-ins summarized from GitHub PRs and Linear tickets.",
      description:
        "Generates a crisp daily team digest from real merged work instead of nagging engineers with Slack standup bots every morning.",
      notForWhom: "Not for non-technical teams that do not track deliverables in GitHub, GitLab, or Linear.",
      websiteUrl: "https://asyncbrief.io",
      tryNowUrl: "https://asyncbrief.io/demo",
      pricingUrl: "https://asyncbrief.io/pricing",
      demoVideoUrl: null,
      logoMark: "AB",
      category: "PRODUCTIVITY",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 24,
      noCreditCardTrial: true,
      selfHostable: false,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "LIVE",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 164,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(6).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: true,
      revenueBand: "EARLY_PAYING",
      lastVerifiedActiveAt: daysAgo(6),
      launchedAt: daysAgo(30),
    },
  ];

  // 5. Pending Editorial Queue Submissions (1 clean passing + 1 waitlist-flagged slop example)
  const pendingProductsData = [
    {
      slug: "invoicegrid",
      makerId: makerLiam.id,
      cohortId: null,
      name: "InvoiceGrid",
      tagline: "EU VAT-compliant PDF invoices and Stripe receipt customization for solo SaaS.",
      description:
        "Automatically regenerates compliant VAT/GST invoices with customer tax IDs, reverse-charge notes, and custom branding without touching Stripe's locked billing portal.",
      notForWhom:
        "Not a full double-entry accounting suite like Xero or QuickBooks; handles customer-facing SaaS invoicing only.",
      websiteUrl: "https://invoicegrid.io",
      tryNowUrl: "https://app.invoicegrid.io/demo",
      pricingUrl: "https://invoicegrid.io/pricing",
      demoVideoUrl: null,
      logoMark: "IG",
      category: "BILLING_FINOPS",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 19,
      noCreditCardTrial: true,
      selfHostable: false,
      dataExportable: true,
      fundingStage: "BOOTSTRAPPED",
      status: "SUBMITTED",
      preflightPassed: true,
      preflightReportJson: makePreflightJson({
        passed: true,
        httpStatus: 200,
        responseTimeMs: 155,
        pricingReachable: true,
        waitlistSuspected: false,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(0).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: true,
      revenueBand: "EARLY_PAYING",
      lastVerifiedActiveAt: daysAgo(0),
      launchedAt: null,
    },
    {
      slug: "autogrowth-x",
      makerId: makerPriya.id,
      cohortId: null,
      name: "AutoGrowth X (Waitlist Example)",
      tagline: "Autonomous AI sales agent that 10x closes deals while you sleep.",
      description:
        "Revolutionary AI growth engine for modern founders. Reserve your spot on our private invite list to unlock next-generation outbound automation.",
      notForWhom: "Everyone who wants to grow fast can use this.",
      websiteUrl: "https://autogrowthx-example.ai",
      tryNowUrl: "https://autogrowthx-example.ai/waitlist",
      pricingUrl: "https://autogrowthx-example.ai/contact",
      demoVideoUrl: null,
      logoMark: "AX",
      category: "GROWTH_CRM",
      pricingModel: "PAID_ONLY",
      startingPriceUsd: 99,
      noCreditCardTrial: false,
      selfHostable: false,
      dataExportable: false,
      fundingStage: "SEED_VC",
      status: "SUBMITTED",
      preflightPassed: false,
      preflightReportJson: makePreflightJson({
        passed: false,
        httpStatus: 200,
        responseTimeMs: 640,
        pricingReachable: false,
        waitlistSuspected: true,
        githubActiveWithin90d: null,
        checkedAt: daysAgo(0).toISOString(),
      }),
      githubRepoUrl: null,
      githubLastCommitAt: null,
      domainVerified: false,
      revenueBand: "UNVERIFIED",
      lastVerifiedActiveAt: null,
      launchedAt: null,
    },
  ];

  const createdProducts: Record<string, { id: string; slug: string }> = {};
  for (const data of [
    ...activeProductsData,
    ...archivedProductsData,
    ...pendingProductsData,
  ]) {
    const product = await prisma.product.create({ data });
    createdProducts[product.slug] = { id: product.id, slug: product.slug };
  }

  // 6. Seed Visits, Bookmarks, and Substantive Verified Teardowns
  async function addVerifiedTeardown(params: {
    slug: string;
    author: { id: string; verifiedIdentityType: string };
    useCaseTested: string;
    strongestFeature: string;
    missingOrFriction: string;
    wouldRecommend: "YES" | "WITH_CAVEATS" | "NOT_YET";
    timeSpentMinutes: number;
    daysBack: number;
  }) {
    const product = createdProducts[params.slug];
    const visit = await prisma.productVisit.create({
      data: {
        productId: product.id,
        userId: params.author.id,
        sessionHash: `seed-session-${params.author.id}-${params.slug}`,
        clickedTryNow: true,
        referrer: "weekly-drop",
        createdAt: daysAgo(params.daysBack),
      },
    });

    const badge =
      params.author.verifiedIdentityType === "GITHUB"
        ? "GITHUB"
        : params.author.verifiedIdentityType === "WORK_EMAIL"
        ? "WORK_EMAIL"
        : "MEMBER";

    const qualityWeight = calculateTeardownWeight({
      identityBadgeSnapshot: badge,
      wouldRecommend: params.wouldRecommend,
      useCaseTested: params.useCaseTested,
      strongestFeature: params.strongestFeature,
      missingOrFriction: params.missingOrFriction,
      timeSpentMinutes: params.timeSpentMinutes,
    });

    await prisma.teardown.create({
      data: {
        productId: product.id,
        authorId: params.author.id,
        visitId: visit.id,
        useCaseTested: params.useCaseTested,
        strongestFeature: params.strongestFeature,
        missingOrFriction: params.missingOrFriction,
        wouldRecommend: params.wouldRecommend,
        timeSpentMinutes: params.timeSpentMinutes,
        identityBadgeSnapshot: badge,
        qualityWeight,
        status: "PUBLISHED",
        createdAt: daysAgo(params.daysBack),
      },
    });
  }

  // HookVault (Maya's own product — shows rich scorecard metrics & objections!)
  await addVerifiedTeardown({
    slug: "hookvault",
    author: scoutHannah,
    useCaseTested:
      "Routed 250 test Stripe invoice.payment_failed webhooks through the sandbox proxy and simulated a 502 outage on our staging receiver.",
    strongestFeature:
      "Payload schema diffing caught a nested metadata change immediately, and bulk replay respected exponential backoff without duplicating orders.",
    missingOrFriction:
      "Retention on the $19 starter tier caps out at 14 days—would prefer 30 days for monthly billing reconciliation audits.",
    wouldRecommend: "YES",
    timeSpentMinutes: 25,
    daysBack: 0,
  });

  await addVerifiedTeardown({
    slug: "hookvault",
    author: scoutDevon,
    useCaseTested:
      "Evaluated the live sandbox alongside our lead engineer to replace our brittle internal SQS webhook retry script.",
    strongestFeature:
      "Zero sales call required, clear per-event pricing, and clean audit logs that finance can read without asking engineering.",
    missingOrFriction:
      "No built-in Slack digest summary yet—currently fires one alert per failed webhook unless you tune threshold rules manually.",
    wouldRecommend: "WITH_CAVEATS",
    timeSpentMinutes: 18,
    daysBack: 0,
  });

  // Extra visits on HookVault so Maya's Maker Scorecard shows a realistic conversion funnel
  for (let i = 0; i < 14; i++) {
    await prisma.productVisit.create({
      data: {
        productId: createdProducts["hookvault"].id,
        userId: null,
        sessionHash: `anon-visitor-hv-${i}`,
        clickedTryNow: true,
        referrer: i % 2 === 0 ? "weekly-drop" : "directory",
        createdAt: daysAgo(i % 2),
      },
    });
  }

  // ChurnLedger teardowns (Note: Maya has 1 peer teardown here so her Reciprocity Gate sits at 1/2!)
  await addVerifiedTeardown({
    slug: "churnledger",
    author: makerPersona,
    useCaseTested:
      "Connected the Stripe test-mode demo dataset and walked through the involuntary churn cohort breakdown and plain-text email editor.",
    strongestFeature:
      "Plain-text dunning templates look genuinely human and flat $39/mo pricing beats percentage-of-recovered-revenue competitors.",
    missingOrFriction:
      "No multi-currency EUR/GBP breakdown in the top-level recovery forecast yet.",
    wouldRecommend: "YES",
    timeSpentMinutes: 20,
    daysBack: 1,
  });

  await addVerifiedTeardown({
    slug: "churnledger",
    author: scoutDevon,
    useCaseTested:
      "Audited our Q3 involuntary churn numbers against ChurnLedger's recovery projection calculator and inspected Paddle webhook permissions.",
    strongestFeature:
      "Read-only onboarding took under two minutes and immediately isolated 11 expiring corporate cards before renewal.",
    missingOrFriction:
      "Would like CSV export of pre-dunning card expiry cohorts for our account managers.",
    wouldRecommend: "YES",
    timeSpentMinutes: 22,
    daysBack: 0,
  });

  // PgPulse teardowns
  await addVerifiedTeardown({
    slug: "pgpulse",
    author: scoutHannah,
    useCaseTested:
      "Spun up the Docker sidecar against a 6GB Postgres 16 replica and ran a synthetic lock-contention workload for 15 minutes.",
    strongestFeature:
      "Memory footprint stayed under 45MB RAM and surfaced two missing composite indexes with exact EXPLAIN ANALYZE deltas.",
    missingOrFriction:
      "Helm chart documentation assumes standard kube-prometheus annotations; needs a simpler standalone compose example.",
    wouldRecommend: "YES",
    timeSpentMinutes: 30,
    daysBack: 0,
  });

  // RelayDesk teardown
  await addVerifiedTeardown({
    slug: "clearscope-desk",
    author: buyerPersona,
    useCaseTested:
      "Connected a sandbox Linear workspace and tested bidirectional email replies on 5 simulated customer bug tickets.",
    strongestFeature:
      "Engineers never leave Linear while customers receive crisp threaded emails with zero 'ticket #49182' noise.",
    missingOrFriction:
      "Attachments over 10MB silently fall back to external links without warning the replying agent.",
    wouldRecommend: "WITH_CAVEATS",
    timeSpentMinutes: 15,
    daysBack: 0,
  });

  // FunnelTrace teardown
  await addVerifiedTeardown({
    slug: "funneltrace",
    author: scoutDevon,
    useCaseTested:
      "Tested the live attribution dashboard and verified how UTM parameters map through checkout sessions into Stripe MRR.",
    strongestFeature:
      "Directly answers 'which community post brought paying users' instead of vanity traffic spikes.",
    missingOrFriction:
      "Requires first-party subdomain proxy setup if you want to bypass strict ad-blockers on developer audiences.",
    wouldRecommend: "YES",
    timeSpentMinutes: 18,
    daysBack: 0,
  });

  // Archived cohort teardowns
  await addVerifiedTeardown({
    slug: "cronbrief",
    author: scoutHannah,
    useCaseTested:
      "Monitored 12 nightly backup scripts across two Hetzner nodes for 30 days and triggered forced timeout failures.",
    strongestFeature:
      "Still running rock-solid 30 days post-launch; sub-second alert delivery to Slack with zero false positives.",
    missingOrFriction:
      "Terraform provider is still community-maintained rather than official.",
    wouldRecommend: "YES",
    timeSpentMinutes: 40,
    daysBack: 5,
  });

  await addVerifiedTeardown({
    slug: "seatcheck",
    author: scoutDevon,
    useCaseTested:
      "Ran a quarterly audit on a 40-seat Google Workspace sandbox to identify dormant Figma and Notion licenses.",
    strongestFeature:
      "Paid for itself in the first 10 minutes by flagging 6 orphaned contractor seats.",
    missingOrFriction:
      "Okta integration is still marked beta and requires manual CSV upload for non-SSO tools.",
    wouldRecommend: "WITH_CAVEATS",
    timeSpentMinutes: 25,
    daysBack: 8,
  });

  // Bookmarks
  const bookmarkPairs: Array<[string, string]> = [
    [buyerPersona.id, "hookvault"],
    [buyerPersona.id, "pgpulse"],
    [scoutHannah.id, "hookvault"],
    [scoutHannah.id, "pgpulse"],
    [scoutHannah.id, "funneltrace"],
    [scoutDevon.id, "churnledger"],
    [scoutDevon.id, "hookvault"],
    [makerPersona.id, "funneltrace"],
  ];

  for (const [userId, slug] of bookmarkPairs) {
    await prisma.bookmark.create({
      data: { userId, productId: createdProducts[slug].id },
    });
  }

  // Editorial audit log entry for an approved product
  await prisma.reviewAction.create({
    data: {
      productId: createdProducts["hookvault"].id,
      editorId: editorPersona.id,
      cohortId: activeCohort.id,
      decision: "APPROVED",
      feedback:
        "Sandbox tested live with simulated 502 replay. Pricing transparent, GitHub CLI active, and clear non-ICP boundary.",
      createdAt: daysAgo(2),
    },
  });

  console.log(
    `Seeded 7 users, 3 cohorts, ${Object.keys(createdProducts).length} products (6 active, 4 archived, 2 pending review), and verified teardowns.`
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
