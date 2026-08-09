# Ingestion — scrape → normalize → upsert → dedupe → series → scrape_runs

There is no unified chess-tournament API. Supply comes from scrapers plus
hand curation of **pathways** (series + qualification rules).

```
listing + detail scrape
  → Zod normalize (source + source_url)
  → stage JSON under data/staging/
  → upsert competitions (fingerprint stamped; pathway fields preserved)
  → write competition_sources (per-upstream identity)
  → link fingerprint duplicates (archive secondary, keep TLA preferred)
  → attach high-confidence series_id matches
  → pathway enrich (heuristic majority + Claude Haiku batches for suspects)
  → log scrape_runs row
```

## One-time DB setup

Run these in the Supabase SQL editor if not already applied:

1. `0001_init.sql` … `0004_competition_name_search.sql` (existing)
2. **`0005_ingestion_ops.sql`** — `competition_sources`, `scrape_runs`, `fingerprint`, `canonical_id`
3. **`0006_competition_image_url.sql`** — optional `image_url` cover from scrape
4. **`0007_pathway_enrichment.sql`** — `ingestion_sources` logos, `pathway_*` columns, `enrichment_runs`
5. **`0019_hub_scrape_sources.sql`** — OnlineReg / Chess-Results / FIDE source enums + live `ingestion_sources`
6. **`0039_admin_tournament_operations.sql`** — admin deletion RPC, scrape-run visibility, and dispatch audit

## Provenance

| Column / table | Meaning |
| --- | --- |
| `competitions.source` | Pipeline: `manual`, `tla_scrape`, `cca_scrape`, `organizer`, `onlinereg_scrape`, `chess_results_scrape`, `fide_calendar_scrape` |
| `competitions.source_url` | Exact upstream page scraped |
| `competitions.fingerprint` | Normalized name\|date\|state\|zip for cross-source matching |
| `competitions.canonical_id` | Set on archived duplicates → points at the surviving row |
| `competition_sources` | Every upstream sighting; UNIQUE `(source, external_key)` |
| `scrape_runs` | Ops log for each cron / local / Docker run |

Search only shows `status='published'` rows **without** `canonical_id` (duplicates are archived).

## Commands

```bash
npm run scrape:tla              # US Chess upcoming-tournaments
npm run scrape:cca              # Continental Chess (chesstour.com)
npm run scrape:onlinereg        # OnlineRegistration.cc index
npm run scrape:chess-results    # Chess-Results USA search
npm run scrape:fide             # FIDE Calendar tiles
npm run scrape:tca              # Texas Chess Association events + pictures
npm run scrape:all              # All six in sequence (dedupe-friendly)

SCRAPE_UPSERT_ONLY=1 npm run scrape:tla   # re-upsert staged JSON
SCRAPE_HTML_FILE=… SCRAPE_SKIP_DETAIL=1 npm run scrape:tla
SCRAPE_MAX_PAGES=2 npm run scrape:tla
SCRAPE_HTML_FILE=ingestion/fixtures/fide-calendar-tiles.html npm run scrape:fide
SCRAPE_HTML_FILE="ingestion/fixtures/incoming/TCA and TCA Club Events _ Texas Chess Association.html" npm run scrape:tca
```

Standing hints (`details.catalog_standing` / `catalog_class`) come from FIDE tile
classes, Chess-Results player counts, and OnlineReg entry counts — used by
`lib/event-standing.ts` for honest labels (not a prestige score).

**Image fallback:** prefer an event-page cover. If none is available, use an
organizer homepage image (TLA) or an available source-hub image (CCA /
OnlineReg / Chess-Results / FIDE) rather than leaving the card empty. Image
fallback never changes the registration destination.

**Location / publish gate:** same as TLA — real ZIP + coords from `zips`.
Hubs resolve ZIP via listing parse (Chess-Results), or city+state → GeoNames
place index (`data/cache/us-city-zips.json`, built on first scrape) then `zips`
(`details.geo_precision: "city"`). OnlineReg public pages omit street address;
city is guessed from organizer/title when possible.

## Pathways (site + scrapers)

The **qualification graph** lives in curated tables — scrapers never invent rules:

| Table | Role |
| --- | --- |
| `series` | Recurring event identity (Denker, state scholastics, …) |
| `qualification_rules` | Edges with citation + `verified_on` |
| `competitions.series_id` | Links this year’s instance into the graph |

After each scrape, `ingestion/series-match.ts` attaches **high-confidence** name
patterns (e.g. “Texas Scholastic” in TX → Texas Scholastic series). Everything
else stays `series_id=null` for hand linking in Supabase.

Then `ingestion/enrich-pathways.ts` labels every event:

| `pathway_status` | Meaning in UI |
| --- | --- |
| `none` | Default majority — no pathway in our data |
| `uncertain` | Possible qualifier — tell user to check organizer site |
| `known` | Linked series / described related tournaments |

**Cost controls (OpenAI gpt-4.1-mini):**

1. Free heuristic triage skips weekend opens / Swiss / blitz (no tokens).
2. `pathway_input_hash` cache — unchanged events are not re-billed.
3. Batched structured output (~20 events per `generateText` call).
4. Cap: `ENRICH_MAX_AI` (default 80) suspects per run.
5. Model default: `gpt-4.1-mini` (`ENRICH_MODEL` to override).

```bash
# After migration 0007 + OPENAI_API_KEY in .env:
npm run enrich:pathways
ENRICH_SOURCE=tla_scrape ENRICH_MAX_AI=40 npm run enrich:pathways
```

Scrapes call enrichment automatically when `OPENAI_API_KEY` is set.
Set `ENRICH_PATHWAYS=0` to disable.

Product surfaces:

- `/pathways` — explorer (placement → unlocks)
- Event page sidebar — none / uncertain / known organized panel
- Source logos on cards + Data sources section (`public/sources/`)
- Engine: `lib/qualification.ts` (unit-tested)

**Ops cadence for pathways:** review `qualification_rules` yearly when US Chess /
state affiliates publish new criteria; bump `verified_on`. Add new `series` rows
before inventing rules. Extend `SERIES_MATCH_RULES` when a recurring scrape
pattern is stable. Never let the model write `qualification_rules` directly.

## Duplicates

1. **In-batch:** same slug → last write wins before upsert
2. **Per-source re-scrape:** upsert on `slug`, reuse id for that source
3. **Cross-source (TLA ∩ CCA):** same `fingerprint` → keep higher-priority source
   (`tla_scrape` > `cca_scrape`), archive the other with `canonical_id`, move
   `competition_sources` onto the survivor

False merges are rare (name + date + state [+ zip]). If one happens, clear
`canonical_id`, set status back to `published`/`draft` in Supabase, and tighten
the fingerprint inputs.

## Twice-weekly automation (recommended: GitHub Actions)

**Primary:** `.github/workflows/ingest.yml`

- Cron: Mondays + Thursdays **11:00 UTC**
- Runs `npm run scrape:all`
- Manual: Actions → **Ingest tournaments** → choose one source or all

Secrets required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Platform admins can also dispatch this workflow from `/admin/scrapers`. The app
environment needs:

- `GITHUB_ACTIONS_TOKEN` — fine-grained token for this repository with Actions
  write access
- `GITHUB_REPOSITORY` — `owner/repository`
- `GITHUB_ACTIONS_REF` — optional workflow ref; defaults to `dev`

The token stays server-side. The admin page sends only the selected source to
GitHub and reads completed/running results from `scrape_runs`. Workflow
concurrency queues overlapping manual or scheduled requests so two ingestion
runs do not write at the same time.

**Optional Docker** (VPS / local, when you do not want GitHub runners):

```bash
docker compose -f docker-compose.ingest.yml build
docker compose -f docker-compose.ingest.yml run --rm ingest
```

Host cron (Mon/Thu), or keep using GitHub Actions — do **not** run both against
the same DB on the same schedule.

## US Chess (`scrape-tla.ts`)

- Site: https://new.uschess.org/upcoming-tournaments
- `source='tla_scrape'`, `source_url` = event page
- Published when zip + coords resolve; else draft

## CCA (`scrape-cca.ts`)

- Site: https://www.chesstour.com/refs.html
- `source='cca_scrape'`; `reg_url` stays on the event-specific CCA page because
  CCA currently links only to the generic ChessAction homepage
- Requires `0003_cca_source.sql` once

## Texas Chess Association (`scrape-tca.ts`)

- Site: https://texaschess.org/tca-and-tca-club-events/
- `source='tca_scrape'`; migration `0032_tca_scrape_source.sql` is required
- Follows archive pagination and event detail pages for dates, registration,
  and location. Every card image is retained; the run fails instead of silently
  staging image-less TCA rows if their markup changes.

## Fees / sections

Parsed from TLA detail body text and CCA event pages when the copy is clear
(U1000 / Under 1800 / Major / grade bands, `$N entry fee`, free). When nothing
is found the competition gets a single **Open** section (so rating filters
still work) and `entry_fee_cents = null` (“Fee not listed”).

Requires migrations through `0008_nullable_entry_fee.sql`. Run
`npm run scrape:preflight` before a full scrape.

## Other sources (later)

See `data/tournament-sources.txt` (live vs soon hubs, including
OnlineRegistration.cc) and `data/state-affiliates.txt` (all USCF state affiliate
calendars by tier). The product advertises the same list via `TournamentSources`.

New scraper → new `source` value → write `competition_sources` → same fingerprint
pipeline. Prefer extending `SOURCE_PRIORITY` in `ingestion/fingerprint.ts`.
