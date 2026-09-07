# Ingestion — scrape → normalize → upsert → dedupe → series → scrape_runs

There is no unified competition API. Chess supply comes from scrapers plus
hand curation of **pathways** (series + qualification rules). The first
non-chess adapters use only official public pages and skip chess pathway logic.

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
7. **`0047_multi_category_discovery_sources.sql`** — Tabroom, VEX Events, TAEA VASE, and Bennington source ids + category metadata
8. **`0048_doe_science_bowl_source.sql`** — U.S. Department of Energy National Science Bowl source id
9. **`0049_afsa_essay_source.sql`** — AFSA National High School Essay Contest source id
10. **`0050_uil_theatre_source.sql`** — UIL high-school theatre state-meet source id
11. **`0051_pause_tabroom_automation.sql`** — pause Tabroom metadata and archive primary Tabroom listings pending written NSDA permission
12. **`0052_uil_speech_debate_source.sql`** — UIL invitational speech/debate source id
13. **`0053_purple_comet_source.sql`** — Purple Comet! Math Meet source id
14. **`0054_uil_music_marching_source.sql`** — UIL state open-class marching band source id
15. **`0055_txsef_source.sql`** — Texas Science and Engineering Fair source id
16. **`0083_congressional_app_challenge_source.sql`** — Congressional App Challenge national window source id
17. **`0084_congressional_app_challenge_dispatch.sql`** — include that source in platform-admin scraper dispatch audit
18. **`0085_hack_club_hackathons_source.sql`** — Hack Club Hackathons JSON directory source id
19. **`0086_hack_club_hackathons_dispatch.sql`** — include that source in platform-admin scraper dispatch audit
20. **`0056_profile_competition_category.sql`** — nullable account discovery shortcut; no chess default
21. **`0057_district_audience_requires_hierarchy.sql`** — fail-closed district-audience hierarchy enforcement
22. **`0059_competition_facet_updates.sql`** — organizer edits persist `details.facets` without replacing other details

## Provenance

| Column / table | Meaning |
| --- | --- |
| `competitions.source` | Pipeline id, including chess feeds plus `tabroom_scrape`, `vex_events_scrape`, `taea_vase_scrape`, `bennington_writers_scrape`, `doe_science_bowl_scrape`, `afsa_essay_scrape`, `uil_theatre_scrape`, `uil_speech_debate_scrape`, `purple_comet_scrape`, `uil_music_marching_scrape`, `txsef_scrape`, `congressional_app_challenge_scrape`, and `hack_club_hackathons_scrape` |
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
TABROOM_WRITTEN_PERMISSION=1 npm run scrape:tabroom # Only after written NSDA permission
npm run scrape:vex              # Official public VEX Events directory
npm run scrape:taea-vase        # Official public TAEA VASE dates
npm run scrape:bennington-writers # Official Bennington cycle, when year-specific
npm run scrape:doe-science-bowl # Official DOE National Science Bowl national dates
npm run scrape:afsa-essay       # Official AFSA year-specific essay cycle
npm run scrape:uil-theatre      # Official UIL theatre state-meet dates
npm run scrape:uil-speech-debate # Official UIL invitationals with explicit speech/debate offerings
npm run scrape:purple-comet     # Official Purple Comet online math contest window
npm run scrape:uil-music-marching # Official UIL state open-class marching band dates
npm run scrape:txsef            # Official Texas state science-fair dates
npm run scrape:congressional-app-challenge # Official Congressional App Challenge national window
npm run scrape:hack-club-hackathons # Official Hack Club Hackathons JSON directory (virtual + US)
npm run scrape:discovery        # Runnable non-chess adapters in sequence
npm run scrape:all              # All six chess sources in sequence

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

Google Sites and Facebook CDN covers are signed and expire (cards then 403).
Upsert copies those bytes into the public `tournament-covers` bucket. To repair
rows already stored as dead `lh3.googleusercontent.com/sitesv` URLs:

```bash
npx tsx ingestion/refresh-ephemeral-covers.ts
```

Set `SCRAPE_REHOST_COVERS=0` to skip the copy (offline upsert of staged JSON).

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

Non-chess fingerprints include the category before name/date/location. A STEM
event therefore cannot collapse into an Arts, Writing, Debate, or Chess row
with a similar title. Series matching and pathway enrichment run only for
`category='chess'`.

## Official non-chess sources

- **Tabroom (`tabroom_scrape`, Debate):** paused. Causey previously indexed one
  Texas public circuit calendar, but current NSDA Terms expressly apply to
  `tabroom.com`, limit downloads to personal non-commercial viewing, prohibit
  commercial/public reuse, and prohibit automated access for any purpose.
  `robots.txt` allows the calendar and tournament landing paths, but that does
  not override the Terms. Scheduled discovery skips this adapter; direct live
  runs fail before fetching unless written NSDA permission has been recorded
  with `TABROOM_WRITTEN_PERMISSION=1`. Fixture-only parser checks are forcibly
  stage-only, and fixture upsert-only attempts fail without permission.
  Migration `0051` archives only competitions whose primary
  `competitions.source` is `tabroom_scrape`; it preserves `competition_sources`
  and scrape-run audit rows and does not hide organizer/manual competitions
  merely because they have a secondary Tabroom sighting. With the adapter
  absent from scheduled/admin dispatch and its live/upsert path permission
  gated, later runs cannot republish those rows while permission is absent.
- **VEX Events (`vex_events_scrape`, STEM / `robotics`):** public HTML event
  directory. No private API or token is used. Ordinary public requests still
  receive HTTP 403 from a Cloudflare challenge (re-checked 2026-09-02), so live
  refresh remains blocked; no bypass is attempted.
- **TAEA VASE (`taea_vase_scrape`, Arts / `visual_arts`):** official directors'
  dates and state overview. Rows without a specific date remain unstaged.
- **Bennington Young Writers Awards (`bennington_writers_scrape`, Writing):**
  genres come from the official award page. The adapter leaves data unchanged
  when the page gives month/day deadlines without a year.
- **DOE National Science Bowl (`doe_science_bowl_scrape`, STEM /
  `science_bowl` + `mathematics`):** official national-event dates from the
  Office of Science Key Dates page. The adapter requires the separate official
  program page to confirm Washington, D.C.; it does not infer a venue,
  registration link, regional dates, fee, or grade band. Office of Science
  `robots.txt` allows both pages, and its Web Policies identify site materials
  as public domain while requesting source acknowledgment and prohibiting
  implied endorsement. Listing covers may reuse a public-domain Office of
  Science photo; Causey does not use the DOE seal or National Science Bowl
  wordmark as a source logo. Ordinary public HTML for Key Dates, About, and
  the NSB home page returned HTTP 200 on 2026-09-02 / 2026-09-06, so the
  adapter is enabled in aggregate discovery, admin dispatch, and GitHub
  workflow runs. Regional qualifying bowls are not indexed.
- **Texas Science & Engineering Fair (`txsef_scrape`, STEM /
  `science_fair`):** Texas A&M's official public homepage must publish an exact
  year-specific state-fair date range and College Station venue, while its
  general-information page must identify grades 6–12 and statewide finalist
  scope. Causey records only the state event and a regional-qualification
  requirement; it does not enumerate regional fairs, infer feeder pathways, or
  fetch registration portals, PDFs, fees, or deadlines. TXSEF `robots.txt`
  allows both HTML pages with a 10-second crawl delay. Texas A&M's linking
  policy permits attributed links, and these pages publish no automation or
  commercial-use prohibition. Only factual metadata and source links are
  retained.
- **Congressional App Challenge (`congressional_app_challenge_scrape`, STEM /
  `computer_science`):** the official participating-districts HTML page must
  publish an exact year-specific national window (`runs from Month D to Month
  D, YYYY`), while the official rules HTML must confirm middle or high school
  eligibility and the same submit deadline under that year's dates. Causey
  stores one national submission window with
  `details.date_semantics = "submission_deadline"`. It does not emit a row per
  congressional district, copy member names, fetch PDFs, or open the student
  registration portal. The students homepage is ignored because it has
  published stale prior-year copy. `robots.txt` allows these HTML paths while
  disallowing `/wp-admin/`. Reviewed 2026-09-06: published site terms contain
  no automation or commercial-use prohibition.
- **Hack Club Hackathons (`hack_club_hackathons_scrape`, STEM /
  `computer_science`):** the documented public JSON API at
  `hackathons.hackclub.com/api/events/upcoming/` must return year-specific
  start dates. Causey credits “Hack Club Hackathons” with a link to
  `hackathons.hackclub.com`, indexes virtual events plus US in-person/hybrid
  rows that resolve a city and state (ZIP via GeoNames), and drops
  international in-person listings, unpublished rows, logos, and banners. The
  API docs require that credit; the frontend MIT license is not treated as a
  data license. Subdomain `robots.txt` is absent (HTTP 404);
  `hackclub.com/robots.txt` allows `/`. Ordinary JSON returned HTTP 200 on
  2026-09-06.
- **AFSA National High School Essay Contest (`afsa_essay_scrape`, Writing /
  `essay`):** the official contest page must publish the cycle, grade 9–12
  eligibility, and open/closed status, while the separate official Writer's
  Checklist must publish a deadline in the cycle's ending year. Causey stores
  that deadline as both `start_date` and `end_date`, with
  `details.date_semantics = "submission_deadline"`; it never invents an opening
  date, fee, or registration link. Closed exact cycles remain published and are
  found through the Ended/All timing filter. AFSA `robots.txt` allows both
  pages, and its Conditions of Use contain no automation or commercial-use
  prohibition; only factual metadata and source links are retained.
- **UIL Theatre State Meets (`uil_theatre_scrape`, Arts / `theatre`):** the
  official public state-meet page currently yields the two year-specific
  One-Act Play conference ranges and the Theatrical Design State Meet. The
  adapter preserves UIL's tentative status, requires Austin location evidence,
  and records no registration link, fee, street address, or venue. Coverage is
  state-meet only: region, area, district, bi-district, zone, and local events
  are not indexed. UIL `robots.txt` allows `/theatre/state` while disallowing
  `/files/`; Causey reads only the ordinary HTML page and does not fetch or
  reproduce those disallowed assets. The public page links a Web Privacy Policy
  but publishes no applicable automation prohibition; credential-use
  conditions for accredited event media are not used as an access path.
- **UIL State Open Class Marching Band (`uil_music_marching_scrape`, Arts /
  `music`):** the official public HTML page publishes exact conference-group
  date ranges for 2026–2028 at the Alamodome in San Antonio. Causey stages only
  those state open-class rows, preserves the published 1A–6A classifications,
  and leaves entry fees, registration links/deadlines, grade bands, and street
  address unknown. Spectator ticket prices are not treated as participant
  fees. Area, region, local, military-class, and other UIL music contests are
  outside this adapter's coverage. UIL `robots.txt` allows the HTML path while
  disallowing `/files/`; no linked files are fetched or reproduced.
- **UIL Speech & Debate Invitationals (`uil_speech_debate_scrape`, Debate):**
  the official public academic invitational calendar must publish an exact
  year-specific date, complete Texas location, and explicit speech/debate
  offering before a row is staged. Facets come only from named LD, CX/policy,
  Congress, or speech events. Third-party Tabroom and SpeechWire registration
  pages are never fetched, and fees/deadlines are not inferred. UIL
  `robots.txt` allows the calendar path while disallowing `/files/`; this
  adapter reads only ordinary HTML and retains factual metadata with
  attribution.
- **Purple Comet! Math Meet (`purple_comet_scrape`, STEM / `mathematics`):**
  the official homepage must publish an exact next-contest window, while the
  public rules must explicitly identify a free, online, team mathematics
  competition for middle- and high-school students and require an adult
  supervisor. Causey records one international online listing, two competitive
  school-level eligibility sections, and a zero participant fee. It does not
  fetch supervisor login/registration, contest problems, solutions, results,
  or participant data. `robots.txt` allows all paths; the public pages expose
  no general Terms of Use or automation prohibition, while their contest rules
  specifically protect contest problems. Causey retains only factual dates,
  format, eligibility summaries, and source links.

Parser fixtures named `*-public-snippet.html` are minimal excerpts derived from
public pages fetched on 2026-08-12, 2026-08-13, or 2026-09-06, not complete
source snapshots. Never use them with stale retraction.

Restricted or reference-only sources are not scraped: Tabroom and SpeechWire
prohibit automation; Scholastic and YoungArts also restrict automated use;
Science Olympiad Terms limit use to personal non-commercial viewing and forbid
republishing; Poetry Out Loud is governed by Mid Atlantic Arts non-commercial
terms; EdTA schooltheatre.org limits use to personal non-commercial transitory
viewing and forbids mirroring; Music for All forbids automated scripts and
data-mining; WGI `robots.txt` disallows `/events/` and requires written consent
for factual event data; Society for Science's fair finder needs
permission; FIRST requires an appropriate listing license; AoPS and NewPages
are secondary links; Scienteer and zFairs are tenant software rather than
national directories; RobotEvents is not the official 2026–27 VEX pathway.
MATHCOUNTS remains link-only because its terms require prior written consent
to reproduce, retransmit, or republish site materials. MAA AMC publishes exact
2026–27 dates, but its site-wide Terms of Use returned HTTP 403 to ordinary
access during review, so Causey does not assume for-profit public reuse is
permitted. USACO remains reference-only while ordinary homepage requests hit a
Cloudflare challenge and the public recap is not a complete next-season window.
MathWorks M3 remains reference-only until its first-party page publishes a
complete 2027 challenge window.

Outreach checklist (who to ask, what a written yes must cover):
`docs/source-permission-outreach.md`. Printable PDF:
`docs/source-permission-outreach.pdf`. Eligibility gate (what is not an
ingest backlog, including “free API” registry verdicts):
`docs/source-scraper-eligibility.md`.

Politeness: use the shared retrying user agent, run sources sequentially, keep
the twice-weekly cadence, and use `SCRAPE_MAX_EVENTS` for local checks. Do not
increase request concurrency or bypass access controls. A blocked or changed
page should produce no fabricated fixture or event.

## GitHub Actions automation

**Primary:** `.github/workflows/ingest.yml`

- Schedule: Monday and Thursday at 11:00 UTC. GitHub loads schedules from the
  default branch (`main`), while the released workflow explicitly checks out
  `dev` before running ingestion.
- Runs `npm run scrape:all && npm run scrape:discovery`; the discovery runner
  skips Tabroom pending written NSDA permission and skips VEX while ordinary
  public requests return HTTP 403. DOE National Science Bowl runs with the
  other permitted STEM adapters.
- Manual: Actions → **Ingest tournaments** on `dev` → choose one permitted
  source or all
- Tabroom is intentionally absent from Actions/admin/source-filter choices
  while permission is unresolved; it remains an outbound reference link only
- VEX is also absent from Actions/admin dispatch while ordinary access is
  blocked. DOE National Science Bowl is runnable again after ordinary public
  HTML returned HTTP 200 on 2026-09-02. Source governance, count gates, kill
  switches, and freshness thresholds live in `lib/ingestion-sources.ts`.

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
concurrency queues overlapping manual requests so two ingestion runs do not
write at the same time.

**Optional Docker** (VPS / local, when you do not want GitHub runners):

```bash
docker compose -f docker-compose.ingest.yml build
docker compose -f docker-compose.ingest.yml run --rm ingest
```

Use only one scheduler per database. Disable the GitHub schedule before adding
a host cron.

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
