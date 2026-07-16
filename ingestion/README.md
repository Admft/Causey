# Ingestion — scrape → normalize → upsert → dedupe → series → scrape_runs

There is no unified chess-tournament API. Supply comes from scrapers plus
hand curation of **pathways** (series + qualification rules).

```
listing + detail scrape
  → Zod normalize (source + source_url)
  → stage JSON under data/staging/
  → upsert competitions (fingerprint stamped)
  → write competition_sources (per-upstream identity)
  → link fingerprint duplicates (archive secondary, keep TLA preferred)
  → attach high-confidence series_id matches
  → log scrape_runs row
```

## One-time DB setup

Run these in the Supabase SQL editor if not already applied:

1. `0001_init.sql` … `0004_competition_name_search.sql` (existing)
2. **`0005_ingestion_ops.sql`** — `competition_sources`, `scrape_runs`, `fingerprint`, `canonical_id`

## Provenance

| Column / table | Meaning |
| --- | --- |
| `competitions.source` | Pipeline: `manual`, `tla_scrape`, `cca_scrape`, `organizer` |
| `competitions.source_url` | Exact upstream page scraped |
| `competitions.fingerprint` | Normalized name\|date\|state\|zip for cross-source matching |
| `competitions.canonical_id` | Set on archived duplicates → points at the surviving row |
| `competition_sources` | Every upstream sighting; UNIQUE `(source, external_key)` |
| `scrape_runs` | Ops log for each cron / local / Docker run |

Search only shows `status='published'` rows **without** `canonical_id` (duplicates are archived).

## Commands

```bash
npm run scrape:tla          # US Chess upcoming-tournaments
npm run scrape:cca          # Continental Chess (chesstour.com)
npm run scrape:all          # TLA then CCA (recommended for dedupe)

SCRAPE_UPSERT_ONLY=1 npm run scrape:tla   # re-upsert staged JSON
SCRAPE_HTML_FILE=… SCRAPE_SKIP_DETAIL=1 npm run scrape:tla
SCRAPE_MAX_PAGES=2 npm run scrape:tla
```

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

Product surfaces:

- `/pathways` — explorer (placement → unlocks)
- Event page sidebar — “What winning here unlocks”
- Engine: `lib/qualification.ts` (unit-tested)

**Ops cadence for pathways:** review `qualification_rules` yearly when US Chess /
state affiliates publish new criteria; bump `verified_on`. Add new `series` rows
before inventing rules. Extend `SERIES_MATCH_RULES` when a recurring scrape
pattern is stable.

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
- Manual: Actions → **Ingest tournaments** → Run workflow

Secrets required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

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
- `source='cca_scrape'`, `reg_url` → chessaction.com
- Requires `0003_cca_source.sql` once

## Fees / sections

Not auto-parsed yet (`entry_fee_cents` may be 0; no sections written). Enrich by
hand or a future detail parser — pathways still work via `series_id`.

## Other sources (later)

See `data/tournament-sources.txt` (live vs soon hubs, including
OnlineRegistration.cc) and `data/state-affiliates.txt` (all USCF state affiliate
calendars by tier). The product advertises the same list via `TournamentSources`.

New scraper → new `source` value → write `competition_sources` → same fingerprint
pipeline. Prefer extending `SOURCE_PRIORITY` in `ingestion/fingerprint.ts`.
