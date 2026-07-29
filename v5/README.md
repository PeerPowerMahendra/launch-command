# Launch Command v5

A production-grade SaaS that turns **one product brief** into a full, channel-consistent marketing campaign — personas, Meta ads, Google ads, landing pages, and email sequences. Users never write prompts; expert prompts run server-side and Claude returns validated JSON.

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Claude (`claude-sonnet-5`) · Upstash · Stripe · PostHog.

> **Note on the stack:** this `v5/` app is a separate, standalone Next.js project (deploys to Vercel), distinct from the vanilla-JS v2–v4 apps in the repo root (which deploy to Netlify).

## Quick start

```bash
cd v5
cp .env.example .env.local     # add ANTHROPIC_API_KEY (see below)
npm install
npm run dev                    # http://localhost:3000
```

The app **runs and builds with zero external services** — every integration activates only when its keys are present. The one thing you need for *real* generation is an Anthropic key; without it the app loads and the API returns a clear "engine not connected" message.

## Environment variables

All live in `.env.local` (see `.env.example`). Only `ANTHROPIC_API_KEY` is needed for generation; the rest light up their features when added.

| Var | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude generation (`claude-sonnet-5`) | **Yes** for generation |
| `NEXT_PUBLIC_SITE_URL` | Canonical/OG URL | Recommended |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + Postgres | For accounts + saved campaigns |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin ops | For webhooks |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | API rate limiting (5/min/user) | Optional |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PRICE_*` | Billing (Phase 4) | Optional |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | Product analytics | Optional |

## Supabase migration

1. Create a project at supabase.com; copy the URL + anon key into `.env.local`.
2. Run the migration (SQL editor → paste, or CLI):

   ```bash
   supabase db push          # or paste supabase/migrations/0001_init.sql
   ```

   It creates `profiles`, `campaigns`, `generations`, `kanban_tasks`, a signup trigger that auto-creates a profile, an atomic monthly-usage RPC (`increment_generations`), and **Row Level Security so users only ever see their own rows**.
3. In Auth settings, enable Email (magic link) and Google OAuth.

## Deploy to Vercel

1. Push the repo; in Vercel, **set the project root to `v5/`**.
2. Add every env var from `.env.example` (at minimum `ANTHROPIC_API_KEY`) in Project → Settings → Environment Variables.
3. Deploy. `next build` is the build command (default). The `/api/generate` route runs on the Node.js runtime with a 60s max duration.

## Architecture

**One generic engine; each generator is just a config.** A generator = `{ id, label, formFields, system, buildPrompt, schema }` in `lib/generators/*.ts`. Adding generator #4 is a new config file — nothing else changes.

```
form  ->  POST /api/generate  ->  build prompt from campaign record
      ->  Claude returns JSON  ->  strip fences -> zod-validate (one auto-retry)
      ->  editable output UI   ->  (edits persist to Supabase once wired)
```

`/api/generate` enforces, in order: engine-configured check -> rate limit (Upstash) -> **usage limit before calling Claude** (free = 3/mo) -> generate -> increment usage -> PostHog event. Each guard no-ops safely when its service isn't configured.

### The three generators
- **Campaign Workspace** — executive summary, persona, 3 Meta ad angles, Google ads (real 30/90-char limits), email send-plan.
- **Landing Page Generator** — PAS/CRO copy (+ SEO keywords, page goal). *HTML export: Phase 4.*
- **Email Generator** — full lifecycle sequences with A/B subjects + merge tags.

## Build status (honest)

- **Phase 1 (foundation) — done:** design system, dark theme, UI primitives, Supabase schema + RLS + migration, campaign/usage data model.
- **Phase 2 (engine) — done:** generic runner + all 3 generator configs + zod validation + `/api/generate` with rate-limit and usage-metering guards + the working app UI.
- **Phase 3 (landing) — done:** full landing page — animated hero, comparison, bento features, marquee, pricing, FAQ, SEO metadata/OG.
- **Needs your keys to go live:** Supabase auth + persistence, Upstash, PostHog — code is wired, add credentials to activate.
- **Phase 4 (stubbed):** Stripe checkout/webhooks, landing-page HTML export, dnd-kit Kanban board, OG image generation. Interfaces exist (`lib/stripe.ts`, `lib/plans.ts`); wiring pending.
