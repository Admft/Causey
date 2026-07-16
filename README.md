# Causey — scholastic chess discovery (MVP)

The product app for [causey.dev](https://causey.dev): search every scholastic
chess tournament near a zip code with **entry fees and section eligibility up
front**, and trace **qualification pathways** — the invisible chains where
winning a state championship earns an invitation to a national invitational
(Denker, Barber, Rockefeller, Haring). Chess only, US only, by design; the
schema is category-extensible for later.

## Run it

```
npm install
npm run dev
```

That's the whole setup — it boots with an **empty `.env`** on seeded mock
data (46 competitions, 187 sections, a working qualification graph) and makes
no network calls. `npm test` runs the qualification-engine suite.

Try: zip `75201` within 100 mi, then open the North Texas Scholastic Regional
and check `/pathways` with "1st place" — the chain runs regional → Texas
Scholastic Championship → Denker → U.S. Junior.

## What's deliberately NOT here

- **No accounts, no auth, no student PII** — users are mostly minors (COPPA).
  "If I win X" is a query input; nothing about a person is stored.
- **No in-app registration or payments** — event pages link out to the
  organizer's own registration site.
- **No admin UI** — the Supabase table editor is the admin panel for the MVP.

## Architecture

```
app/                    Next.js App Router pages + API routes
  page.tsx              search (zip + radius + filters)
  event/[slug]/         event detail: sections, eligibility badges,
                        link-out, "what winning here unlocks"
  pathways/             pathway explorer (event + placement → what it opens)
  api/                  competitions, competitions/[slug], pathways
components/             CompetitionCard, SearchFilters, EligibilityBadges,
                        PathwayExplorer, PathwayList, CauseyLogo
lib/
  data/                 DataSource interface + mock (default) and Supabase
                        implementations, selected by DATA_SOURCE env flag
  qualification.ts      pure recursive pathway walk (unit-tested)
  geo.ts                haversine distance
  schemas.ts            Zod schemas — DB rows, seed JSON, and API all share them
  ratings.ts            USCF/MSA lookup — interface stub for future verified mode
data/seed/              generated seed JSON (see scripts/generate-seed.mjs)
ingestion/              US Chess TLA scraper → draft rows → human review
supabase/migrations/    full schema: competitions, sections, series,
                        qualification_rules, zips (cube + earthdistance)
tests/                  qualification engine suite (vitest)
```

**Every external dependency sits behind a typed seam.** The app imports
`getDataSource()` and never a concrete backend; `DATA_SOURCE=mock` (default)
reads seed JSON in-process, `DATA_SOURCE=supabase` hits the real database.
Going live = run the migration, seed, flip the flag (see `SETUP.md`).

**Why `series` exists:** "winning the Texas HS Championship qualifies you for
the Denker" is a fact about recurring events, not about the 2027 instance.
Rules key on `series`; each year's tournament is a `competition` attached to
one. The graph survives year over year with no rework.

**Seed data is labeled, not laundered.** Events are realistic but
illustrative, and the seeded qualification rules are scaffolding pending
verification against official US Chess announcements — flagged in the UI
footer, the seed generator, and `SETUP.md` step 6.

## Design

Tokens, type scale, radii, shadows, and component patterns come from
`CAUSEY-DESIGN-SYSTEM.txt` (the marketing-site source of truth), under the
constraints in `anti-vibecode-rules.txt`. Brand red `#c23b32` is the only
primary accent; the coordinate-grid motif marks the search band — access
shouldn't depend on where you live.
