# Ingestion — staging → human review → publish

There is no unified chess-tournament API. Supply comes from scrapes and hand
curation, and **nothing scraped ever goes live without a human**:

```
scrape (draft rows) ──► human review in Supabase table editor ──► status='published'
```

The app only reads `status='published'`. Drafts are invisible to students.

## US Chess TLA scraper (`scrape-tla.ts`)

The primary feed: US Chess Tournament Life Announcements
(https://new.uschess.org/tournaments). HTML scrape — no API exists.

```
npm run scrape:tla
```

- Runs **only** on demand or via the (disabled) GitHub Actions cron. Never at
  build or dev time.
- Parses the listing table defensively (missing cells skip the row), validates
  every row with Zod (`ingestion/normalize.ts`), and normalizes to
  `Competition` records with `source='tla_scrape'`, `status='draft'`.
- With Supabase configured (`SUPABASE_SERVICE_ROLE_KEY`), drafts upsert into
  `competitions` keyed on slug (re-runs don't duplicate). Without Supabase,
  drafts land in `data/staging/tla-drafts.json` (gitignored).
- **TODO: verify selectors against the live TLA page before the first real
  run.** The markup changes periodically; when the scraper parses 0 rows it
  exits non-zero and tells you to fix selectors.

### What a reviewer must do per draft

The TLA index page doesn't carry everything, so drafts arrive with sentinels:

| Field | Draft value | Reviewer action |
| --- | --- | --- |
| `zip`, `lat`, `lng` | `00000`, `0`, `0` | Fill from the TLA detail page / venue address |
| `entry_fee_cents` | `0` | Fill from the detail page (fee visibility is a core feature — don't publish without it) |
| `reg_url` | TLA detail URL | Replace with the organizer's registration link if one exists |
| sections | none | Add `sections` rows with real eligibility (rating/grade/age/gender/residency) |
| `series_id` | null | Attach to a `series` if this is a recurring event (state championships especially — the qualification graph keys on series) |

Then set `status='published'`.

## Other sources (status)

- **State affiliate sites** (Texas Chess Association, NYSCA, CalChess, …):
  where state championships — the anchors of qualification chains — are
  announced. Every site is different; hand-curate until a per-site scraper is
  worth it.
- **US Chess MSA** (ratings/crosstables): future "verified mode" only. See the
  interface stub in `lib/ratings.ts`.
- **Registration platforms** (Caissa, King Registration): future organizer
  partnerships; richer detail than TLAs. Not in MVP.

## Cron

`.github/workflows/ingest.yml.disabled` is a weekly scaffold. Enable it
(remove the `.disabled` suffix, add `SUPABASE_*` repo secrets) only after
verifying the scraper against the live page — see SETUP.md step 5.
