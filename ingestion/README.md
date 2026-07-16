# Ingestion — scrape → normalize → upsert (with provenance)

There is no unified chess-tournament API. Supply comes from scrapers plus
hand curation.

```
listing + detail scrape
   → Zod normalize (source + source_url set)
   → upsert competitions in Supabase
   → published when zip/coords resolve; else draft for review
```

## Provenance (how we know where a row came from)

Every competition row carries:

| Column | Meaning |
| --- | --- |
| `source` | Which pipeline wrote it: `manual`, `tla_scrape`, `organizer` |
| `source_url` | Exact upstream page scraped (US Chess event URL for TLA) |
| `reg_url` | Where the user goes to register / learn more (organizer site when known, else `source_url`) |

Run `supabase/migrations/0002_source_url.sql` once if your project was created before this column existed.

## US Chess upcoming-tournaments (`scrape-tla.ts`)

Primary feed: https://new.uschess.org/upcoming-tournaments

```bash
# Full live scrape (paginated listing + detail pages → Supabase)
npm run scrape:tla

# Listing only, from the saved HTML fixture (no listing network call)
SCRAPE_HTML_FILE=ingestion/fixtures/upcoming-tournaments-page0.html \
  SCRAPE_SKIP_DETAIL=1 \
  npm run scrape:tla

# Cap pages while testing
SCRAPE_MAX_PAGES=2 npm run scrape:tla
```

Behavior:

- Identifies as `CauseyBot/0.1 (+https://causey.dev)`
- Paginates `?page=N` until empty / max pages
- Detail pass fills address, zip, venue, organizer website, online flag
- Skips `Online Event: Yes`
- Resolves `lat`/`lng` from the Supabase `zips` table when zip is known
- Sets `source='tla_scrape'` and `source_url` to the US Chess event page on every row
- Upserts on `slug` (re-runs refresh data; stable ids for existing TLA rows)
- Never runs at Next.js build or request time — only this script / cron

### Draft vs published

| Condition | status |
| --- | --- |
| Valid 5-digit zip + coords in `zips` | `published` (shows in `/chess`) |
| Missing zip/coords | `draft` (invisible until enriched) |

Fees and sections are **not** auto-parsed from prose yet (`entry_fee_cents` may be 0). Pathways are curated separately later.

## Cron

`.github/workflows/ingest.yml.disabled` — enable after a successful local run:

1. Confirm `npm run scrape:tla` works against live US Chess
2. Add repo secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Rename to `ingest.yml`

## Continental Chess Association (`scrape-cca.ts`)

Schedule hub: https://www.chesstour.com/refs.html

```bash
npm run scrape:cca

# Listing fixture only (no listing network call)
SCRAPE_HTML_FILE=ingestion/fixtures/cca-refs.html npm run scrape:cca

# Re-upsert last staged file without re-scraping
SCRAPE_UPSERT_ONLY=1 npm run scrape:cca
```

- Sets `source='cca_scrape'` and `source_url` to the CCA event page
- Sets `reg_url` to https://www.chessaction.com/ (CCA's ENTER NOW target)
- Stages to `data/staging/cca-drafts.json` before upsert
- Requires `supabase/migrations/0003_cca_source.sql` once (adds `cca_scrape` to the source check)

## Other sources (later)

Same pattern: new scraper file → new `source` value → `source_url` set to that site’s event page.
