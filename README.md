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
- **Database:** Prisma v6 + PostgreSQL (Neon, Supabase, Vercel Storage, or local Postgres)
- **Auth:** HTTP-only signed `jose` JWT sessions (built-in `scrypt` Email + Password sign-up/sign-in, plus optional GitHub OAuth 2.0, Resend Work-Email magic links, and `DEV_AUTH_MODE=true` 1-click persona switcher)
- **Testing:** Vitest (`src/lib/__tests__/*`)

## Deploying to Vercel

1. In your Vercel project dashboard, open **Storage** and connect a PostgreSQL database (e.g., **Neon** or **Supabase**). This automatically injects `DATABASE_URL` (and/or `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`).
2. Add the following **Environment Variables** in Vercel Project Settings:
   - `AUTH_SECRET` — any random 32+ character string for signing session cookies.
   - `APP_URL` — your production Vercel URL (e.g., `https://verifylaunch.vercel.app`).
   - `RESEND_API_KEY` *(for live email sign-in)* — API key from [Resend](https://resend.com); optionally set `EMAIL_FROM` (defaults to `VerifyLaunch <onboarding@resend.dev>`).
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` *(for live GitHub OAuth)* — set the GitHub OAuth App callback URL to `<APP_URL>/api/auth/github/callback`.
   - `DEV_AUTH_MODE` — set to `"true"` if you want instant sign-in links + the 1-click **Buyer / Maker / Editor** demo persona switcher without setting up Resend/GitHub yet (set `"false"` in production).
3. Deploy (or **Redeploy** after adding env vars). `vercel.json` runs `npm run vercel-build`, which automatically:
   - generates the Prisma Client for PostgreSQL,
   - pushes the schema (`prisma db push --skip-generate`),
   - seeds initial demo cohorts & personas **only once** if the database is empty, and
   - builds the Next.js application.

## Local Quickstart

```bash
# 1. Copy environment variables and set DATABASE_URL to your PostgreSQL instance
cp .env.example .env.local
cp .env.example .env

# 2. Install dependencies (runs prisma generate via postinstall)
npm install

# 3. Push PostgreSQL schema and seed realistic demo data
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
- `npm run build` — Generate Prisma client + Next.js production build
- `npm run vercel-build` — Vercel build command (generate client, push Postgres schema, seed once if empty, build)
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest unit test suite
- `npm run db:push` — Generate Prisma client & sync PostgreSQL schema
- `npm run db:seed` — Reset & seed demo cohorts, users, products, and teardowns
- `npm run db:reset` — Force-reset database and re-seed
