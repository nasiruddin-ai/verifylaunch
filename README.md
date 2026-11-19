# VerifyLaunch

A curated product launch and discovery platform for **bootstrapped B2B / prosumer SaaS and developer-adjacent tools**—built around human-tested teardowns instead of 24-hour upvote rings.

## Core Mechanics

1. **Curated Weekly Cohort Drops (`/` & `/cohorts/[slug]`):** 7-day launch windows capped at 8 vetted products, randomized for the first 48 hours to neutralize timezone and audience-size bias, with an interactive side-by-side **Comparison Matrix**.
2. **Buyer-First Filterable Directory (`/directory`):** URL-synced filters for category, starting price floor (`$0`, `<= $29`, `<= $49`), No-Credit-Card trial, bootstrapped/indie-only, and self-hostable tools.
3. **Click-Before-Teardown Verification (`/products/[slug]` & `/go/[slug]`):** Reviewers must click through the tracked outbound test link before unlocking a structured 3-part teardown (*Workflow tested*, *Strongest feature*, *Missing piece / friction*), weighted by verified GitHub / Work Email identity.
4. **Anti-Slop Submission Gate (`/submit`):** Automated pre-flight URL/pricing/waitlist diagnostics (`src/lib/preflight.ts`), mandatory *"Who this is NOT for"* disclosure, and a reciprocal quality gate requiring `2` peer teardowns for free weekly cohort slots.
5. **Private Maker Conversion Scorecard (`/maker`):** Tracks qualified outbound clicks, unique evaluators, test-to-teardown conversion rate, and synthesized buyer objections.
6. **Editorial Review Queue (`/admin/review`):** Role-gated moderation queue enforcing cohort slot caps, live active-verification health sweeps, and an immutable `ReviewAction` audit trail.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (editorial archival-paper design tokens)
- **Database:** Prisma v6 + SQLite locally (Postgres-ready schema)
- **Auth:** HTTP-only signed `jose` JWT sessions (GitHub OAuth 2.0, Work-Email magic link, and `DEV_AUTH_MODE=true` 1-click persona switcher)
- **Testing:** Vitest (`src/lib/__tests__/*`)

## Local Quickstart

```bash
# 1. Copy environment variables
cp .env.example .env.local
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Push SQLite schema and seed realistic demo data
npm run db:push
npm run db:seed

# 4. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Local Dev Personas (`DEV_AUTH_MODE=true`)

Use the top `DEV AUTH` switcher bar (or `/auth`) to jump between seeded roles with zero external API keys:

- **Buyer / Scout (`alex@acme-ops.io`)** — Verified Work Email; test the Click-Before-Teardown unlock flow on any unvisited product dossier.
- **Indie Maker (`maya@bootstrapped.dev`)** — Verified GitHub; starts at `1 / 2` peer teardowns (demonstrates both the locked `/submit` gate and live unlock) and owns **HookVault** on `/maker`.
- **Editor (`editor@verifylaunch.dev`)** — Full access to `/admin/review` with 2 seeded submissions (1 passing pre-flight, 1 waitlist-flagged example).

### Scripts

- `npm run dev` — Start local Next.js dev server
- `npm run build` — Production build + TypeScript check
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest unit test suite
- `npm run db:push` — Generate Prisma client & sync SQLite schema
- `npm run db:seed` — Reset & seed demo cohorts, users, products, and teardowns
- `npm run db:reset` — Force-reset database and re-seed
