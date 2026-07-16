# SETUP — current state, how to run it, and what is left

This repo already contains a working MVP of the Causey product app focused on
US scholastic chess discovery.

The app can be run locally today with no secrets and no external services:

```bash
npm install
npm run dev
```

By default, `DATA_SOURCE=mock`, so the app reads seeded JSON from `data/seed/`
and makes no network calls during normal product usage. The default local demo
includes seeded competitions, sections, and a working qualification graph.

`npm test` runs the qualification-engine suite.

## What is already built

The following pieces are already implemented in this repository:

- A Next.js App Router product app.
- Search UI for scholastic chess tournaments by zip and radius.
- Filtering by state, grade band, rating band, fee, and date window.
- Event detail pages with:
  - entry fee visibility,
  - section-level eligibility badges,
  - organizer registration link-outs,
  - a sidebar showing what winning the event can unlock.
- A qualification pathway explorer at `/pathways`.
- API routes for:
  - `/api/competitions`
  - `/api/competitions/[slug]`
  - `/api/pathways`
- A pure qualification engine in `lib/qualification.ts`.
- Test coverage for the qualification engine in `tests/qualification.test.ts`.
- Seeded mock data for competitions, sections, series, and qualification rules.
- A typed data-source seam:
  - `DATA_SOURCE=mock` uses in-repo JSON.
  - `DATA_SOURCE=supabase` uses the database-backed implementation.
- Supabase migration and seed scripts.
- A US Chess TLA ingestion scraper that stages drafts for human review.
- A disabled GitHub Actions cron scaffold for recurring ingestion.

## What is intentionally not built

These are not missing by accident; they are deliberate MVP constraints:

- No accounts
- No authentication
- No student profiles
- No stored student PII
- No in-app registration or payments
- No in-app admin dashboard

The current MVP assumes registration happens on organizer sites, and admin work
happens in Supabase directly.

## How to run it right now

### Local demo mode

Use this when you just want to work on the app locally:

1. Run `npm install`
2. Run `npm run dev`
3. Open the local Next.js app in the browser

Notes:

- `.env` is optional in demo mode.
- `DATA_SOURCE` defaults to `mock`.
- Search works only for zip codes present in `data/zips.sample.json`.
- Good demo zips include:
  - `75201` for Dallas
  - `10001` for New York
  - `90012` for Los Angeles
  - `60602` for Chicago

### Helpful commands

- `npm run dev` — start the app locally
- `npm test` — run tests
- `npm run seed:generate` — regenerate seed files
- `npm run seed:supabase` — load seed data into Supabase
- `npm run scrape:tla` — scrape US Chess upcoming-tournaments into Supabase
- `SCRAPE_HTML_FILE=... npm run scrape:tla` — parse a local HTML fixture
- `SCRAPE_MAX_PAGES=2 npm run scrape:tla` — limit pagination while testing

## What still needs to be built or integrated before launch

The app is functional as a local MVP, but several launch-critical pieces still
need to be completed or connected.

## 1. Create the Supabase project and run the migration

What exists already:

- `supabase/migrations/0001_init.sql`
- `lib/data/supabase.ts`
- `scripts/seed-supabase.ts`

What still needs to happen:

- Create a real Supabase project.
- Run `supabase/migrations/0001_init.sql` against it.

Why this matters:

- This is the real persistence layer for production.
- The migration creates tables, indexes, RLS policies, and enables `cube` plus
  `earthdistance`.

## 1b. Add scraper provenance column (if not already)

Run `supabase/migrations/0002_source_url.sql` in the SQL editor. This adds
`competitions.source_url` so every scraped row stores the exact upstream page
alongside `source` (`tla_scrape` for the US Chess upcoming-tournaments scraper).

## 2. Load the full US zip-to-lat/lng dataset

What exists already:

- `data/zips.sample.json` with a small demo subset (mock mode only).
- `scripts/load-zips.ts` — downloads the GeoNames US postal dump and upserts into Supabase.

What still needs to happen:

```bash
npm run seed:zips
```

That downloads ~40k unique 5-digit US zips into the `zips` table (idempotent). Cached extract lands in `data/staging/` (gitignored). Re-run anytime.

Why this matters:

- The sample zip file is enough for demos only.
- Real users will fail zip search unless their zip is in the lookup table.

Recommended data shape:

- `zip`
- `lat`
- `lng`

## 3. Fill `.env` for real data mode

What exists already:

- `.env.example`
- Data-source switching in `lib/data/index.ts`

What still needs to happen:

1. Copy `.env.example` to `.env`
2. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Set `DATA_SOURCE=supabase`

Why this matters:

- This is the full cutover from local seeded data to the real backend.
- No app code needs to change when switching modes.

## 4. Seed the real database

What exists already:

- Seed JSON in `data/seed/`
- The `npm run seed:supabase` script

What still needs to happen:

- Run `npm run seed:supabase`

Why this matters:

- It loads the seeded MVP data into Supabase so the production-backed app has
  the same baseline dataset as local mock mode.

## 5. Verify the TLA scraper and enable recurring ingestion

What exists already:

- `ingestion/scrape-tla.ts`
- `ingestion/README.md`
- `.github/workflows/ingest.yml.disabled`

What still needs to happen:

1. Run `npm run scrape:tla` locally.
2. If it parses zero rows, fix the selectors in `ingestion/scrape-tla.ts`.
3. Review staged draft rows manually.
4. Fill missing draft values such as:
   - zip
   - coordinates
   - entry fee
   - sections
   - series linkage
5. Change reviewed rows from `draft` to `published`.
6. Rename `.github/workflows/ingest.yml.disabled` to `ingest.yml`.
7. Add required GitHub secrets.

Why this matters:

- There is no official unified event API.
- The ingestion pipeline is how the app grows beyond the initial seeded data.
- Scraped data is intentionally not auto-published.

## 6. Replace scaffold qualification rules with verified rules

This is one of the biggest remaining product tasks.

What exists already:

- A working qualification engine
- Seeded qualification rules
- UI and API support for pathway tracing
- Test coverage around the engine behavior

What still needs to happen:

- Replace the seeded placeholder/scaffold rules with verified official rules.
- Add real citations into `notes`.
- Set real `verified_on` dates.
- Repeat this process yearly as qualification rules change.

Important warning:

The current seeded `qualification_rules` are useful for demoing the product, but
they are not launch-ready truth. Some patterns are real, but several edges are
illustrative scaffolding.

Why this matters:

- The qualification graph is one of the core value propositions of Causey.
- Wrong qualification logic would be a trust-breaking production issue.

## 7. Deploy the app and connect the domain

What exists already:

- A deployable Next.js app

What still needs to happen:

- Deploy the app to the chosen host.
- Point `app.causey.com` to the deployment.
- Wire the main marketing site CTA on `causey.dev` to the app.
- Verify nav and footer links between marketing and product surfaces.

Why this matters:

- The product app and the marketing site are still separate surfaces that need
  to be connected cleanly.

## 8. Decide how operations will work day to day

What exists already:

- Supabase can function as the MVP admin back office.

What still needs to happen:

- Establish the operating workflow for:
  - reviewing scraped drafts,
  - correcting fees and metadata,
  - attaching events to series,
  - curating qualification rules,
  - publishing records safely.

Important note:

There is no custom admin UI yet, and that may be fine for the MVP. But the
human workflow still needs to be owned and documented operationally.

## 9. Future work that is not integrated yet

These are present only as planned seams or partial scaffolding:

- Verified USCF/MSA rating lookup in `lib/ratings.ts`
- Additional ingestion sources beyond US Chess TLA
- Production-scale geographic search improvements using the database-side
  earthdistance path instead of current JS-side radius filtering
- Broader non-chess or non-US expansion

## Short version

If you want the simplest summary:

- Already built: the app UI, APIs, seeded data, qualification engine, tests,
  Supabase integration seam, and ingestion scaffold.
- Still needed for launch: real Supabase setup, full zip data, verified rules,
  reviewed ingestion flow, deployment/domain hookup, and day-to-day ops.

## Recommended order

If someone is taking this from MVP to launch, do the work in this order:

1. Stand up Supabase
2. Load full zip data (`npm run seed:zips`)
3. Fill `.env` and switch to `DATA_SOURCE=supabase`
4. Seed the database (`npm run seed:supabase`)
5. Verify scraper and ingestion workflow
6. Replace seeded qualification rules with verified ones
7. Deploy and connect `app.causey.com`
8. Formalize the operational review/publishing process
