# SETUP — human TODOs, in order

The app runs today with zero secrets: `npm install && npm run dev` boots on
seeded mock data (`DATA_SOURCE=mock`, the default). Everything below is what a
human must do to go live. Work top to bottom.

## 1. Create the Supabase project and run the migration

- Create a project at supabase.com.
- Run `supabase/migrations/0001_init.sql` against it (SQL editor, or
  `supabase db push` with the CLI). It creates all tables, indexes, RLS
  policies, and enables `cube` + `earthdistance` for radius search.

## 2. Load the full US zip → lat/lng dataset

- `data/zips.sample.json` has only ~44 zips covering seeded cities — enough
  for the demo, not for real users.
- **TODO: load the full ~42k-row US zip dataset into the `zips` table.** It's
  static, free data (e.g. the GeoNames US postal-code dump or the Census
  ZCTA gazetteer), loaded once. Columns: `zip, lat, lng`.

## 3. Fill `.env`

- Copy `.env.example` → `.env`.
- Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (for
  scripts) `SUPABASE_SERVICE_ROLE_KEY`.
- Set `DATA_SOURCE=supabase`. That flag is the entire cutover — no app-code
  changes (`lib/data/index.ts` selects the implementation).

## 4. Seed the database

- `npm run seed:supabase` — upserts `/data/seed/*.json` and the zip sample
  into Supabase. Idempotent; safe to re-run.

## 5. Verify the TLA scraper, then enable the cron

- Run `npm run scrape:tla` locally. If it parses 0 rows, the US Chess TLA
  page structure has drifted — fix the selectors in
  `ingestion/scrape-tla.ts` (they're marked with a TODO).
- Review staged drafts per `ingestion/README.md` (fill zip/coords/fee, add
  sections, attach series), then flip `status` to `published`.
- Enable the cron: rename `.github/workflows/ingest.yml.disabled` →
  `ingest.yml` and add the two Supabase secrets to the repo.

## 6. ⚠️ Replace the seeded qualification rules with verified ones

**The seeded `qualification_rules` are plausible scaffolding, NOT verified
truth.** The Denker/Barber/Rockefeller/Haring pattern is real, but the exact
criteria change yearly, the regional-qualifier rules are illustrative, and the
Denker → U.S. Junior edge exists only to demonstrate a 3-hop chain.

Before launch: pull the current US Chess invitational announcements and each
state affiliate's qualification criteria, and replace every rule with a cited
one — real `notes` (source URL/document) and a real `verified_on` date. This
curated graph is the moat; treat rule curation as a recurring yearly task, not
a one-time fix.

## 7. Point app.causey.com at the deployment

- Deploy (any Next.js host), add `app.causey.com` as a custom domain, set the
  DNS record.
- Wire the marketing site's button on causey.dev to https://app.causey.com.
- Confirm the app's nav/footer links back to causey.dev hit the right section
  anchors (`app/layout.tsx` has a TODO with the current guesses).

## 8. Admin panel: there isn't one, on purpose

The Supabase table editor **is** the MVP admin UI — publishing drafts, fixing
fees, curating rules all happen there. No in-app admin, no auth, no user
tables: the audience is mostly minors and we deliberately store no student
PII (COPPA). Don't add accounts casually.
