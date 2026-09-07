# Source scraper eligibility

This is the ingest decision log. It is **not** a backlog of scrapers to build.

A research registry of APIs and list pages is useful for coverage planning. It is not permission to fetch. Causey’s bar is first-party public pages (or a named official API) whose `robots.txt` and terms allow automated fetching **and** commercial/public reuse. An undocumented JSON endpoint, a third-party scrape of the same data, or a Cloudflare challenge is not a license.

Outreach (who to email, what a written yes must cover): [source-permission-outreach.md](source-permission-outreach.md). Engineering: `ingestion/README.md`, `lib/ingestion-sources.ts`, `lib/category-discovery.ts`.

Do not scrape a blocked source while an email is in flight.

## Gate

A source is eligible to **build** an adapter only when all of these hold:

- First-party official public HTML, or a **named official API** (not an undocumented XHR, not a third-party clone of the same data)
- `robots.txt` allows the listing paths
- Terms do **not** ban automation, and do **not** ban commercial/public reuse
- Ordinary requests return HTTP 200 (no Cloudflare / WAF bypass)
- Exact year-specific dates, or no row
- Factual listing metadata only (name, dates, location/online, eligibility/fee if published, official URL). No PII, problems, ballots, results dumps, logos unless granted
- Large orgs / silent terms: recorded `permissionReviewedOn` in `lib/ingestion-sources.ts`; often a courtesy letter

That is why chess is thick and Debate / STEM / Arts / Writing are thin: Tabroom, SpeechWire, Scholastic, MATHCOUNTS, FIRST, Society for Science, VEX Events, and YoungArts already failed this gate.

## Already live — do not rebuild

- Chess: TLA, CCA, OnlineReg, Chess-Results, FIDE, TCA
- Debate: UIL invitationals with explicit speech/debate offerings (Texas only)
- STEM: Purple Comet; DOE National Science Bowl **national** dates; TXSEF **state** fair; Congressional App Challenge **national submission window** (one row, not per district)
- Arts: TAEA VASE; UIL theatre state meets; UIL state open-class marching band
- Writing: AFSA (ended cycle); Bennington (year-specific or no row)

## Phase 1 “free APIs” — none are free wins

| Source | Verdict | Why |
| --- | --- | --- |
| Tabroom `/api/download_data.mhtml` | Do not build | NSDA terms: no automated access; personal non-commercial viewing. Adapter paused (`0051`, `TABROOM_WRITTEN_PERMISSION`). Undocumented JSON is not a license. |
| Debate Land / `http-samc/Tabroom-API` | Do not build | MIT licenses the **code**, not Tabroom’s **data**. Same block as Tabroom. |
| SpeechWire calendar + results | Do not build | Terms prohibit automated indexing. Never fetch SpeechWire as a side effect of UIL. |
| Devpost | Do not build | Terms forbid scrape/crawl/spider. Hidden listing XHR is the Tabroom pattern. |
| RobotEvents v2 | Do not build as a VEX substitute | Not the official 2026–27 pathway. Official directory `events.vex.com` still returns HTTP 403; no bypass. |
| FRC / FTC Events APIs | Do not ingest | FIRST ToU: Events Data may not be used for commercial purposes, including in a product you sell. Ask FIRST (P1 outreach). |
| MLH season page | Do not scrape | Terms: personal non-commercial view; commercial use of the site forbidden. No public event-list API. Third-party scrapers report 403s. Mostly college. |
| CTFtime API | Do not build | API is for data analysis and mobile apps only; no CTFtime clones. A public calendar is closer to a clone. Not K–12 district. |
| Codeforces `contest.list` | Do not build | Terms restrict commercializing website material. Open/college contests, not school district. |
| The Blue Alliance v3 | Do not build yet | TBA invites community apps with attribution. That is not a waiver of FIRST’s Events Data commercial ban. Confirm with TBA **and** keep FIRST on P1 outreach. |

Joy of Tournaments: treat like Tabroom/SpeechWire until a terms + robots pass says otherwise.

NAQT: commercial use limited to running a tournament / media / business eval; automated access generally not permitted except RSS at ≤1/min.

## Already blocked — outreach, not scrapers

Matches [source-permission-outreach.md](source-permission-outreach.md).

**P1:** NSDA/Tabroom, Scholastic Art & Writing, MATHCOUNTS, FIRST  
**P2:** SpeechWire, MAA AMC, REC/VEX Events (ordinary 200s or official listings API — not RobotEvents), Society for Science Find-a-Fair  
**P3:** YoungArts, NSDA.org membership calendars

## Terms pass (2026-09-06)

Reviewed the five “next eligible” candidates. One adapter was built (Congressional App Challenge). The others stay link-only or outreach.

| Source | robots | Terms / access | Dates | Verdict |
| --- | --- | --- | --- | --- |
| **Hack Club Hackathons** `hackathons.hackclub.com` | No `robots.txt` (404) | Documented JSON API; must credit “Hack Club Hackathons” with a link. Do not take logos. Frontend repo is MIT; that licenses code, not a substitute for the API credit rule. | Upcoming JSON returned HTTP 200 with year-specific start/end. Mixed US / virtual / international. | **Eligible later**, not this pass. Attribution required. Restrict any future adapter to virtual events plus US in-person rows that resolve a ZIP. Do not rehost signed cover URLs. |
| **Congressional App Challenge** | Allows `/` except `/wp-admin/` | No site-wide automation or commercial-use prohibition found (privacy + SMS terms only). Ordinary HTML 200. | Participating-districts page publishes `May 1`–`October 26, 2026`. Rules HTML confirms middle/high school eligibility and an October 26 submit deadline under 2026 dates. Students homepage still showed 2025 copy and is **not** used. | **Built.** One national submission window. Do **not** emit a row per congressional district. No member names, no PDFs, no registration-portal fetch. |
| **Science Olympiad invitationals** `soinc.org/play/invitationals` | Allows `/play/invitationals` | Site Terms: personal, **non-commercial** use only; may not reproduce or store Science Olympiad Content on another website without written permission. | National invitational list has exact dates, but that does not override the license. | **Do not scrape.** Written permission required. Do not spawn 50 state-site scrapers. |
| **USACO** | Content-signal robots.txt present | Ordinary homepage hit a Cloudflare challenge (same class of block as VEX). Contest-integrity rules about submission scripts are separate and still forbid automating the grading UI. | 2025–26 recap is not a complete next-season window. | **Do not scrape.** Wait for ordinary HTTP 200 **and** year-specific upcoming windows. Courtesy letter if terms stay silent. |
| **Poetry Out Loud** key-dates | Allows `/key-dates/` | Site is governed by [Mid Atlantic Arts Terms](https://www.midatlanticarts.org/homepage/terms-of-use/): non-profit / educational / **non-commercial** use only; no commercial purpose; no republishing without permission. | 2027 national finals dates are published. | **Do not scrape.** Written permission required. No 50-state coordinator fan-out. |

DOE National Science Bowl **regionals** (`science.osti.gov/.../High-School-Regionals`): same Office of Science public-domain basis as the live national adapter, but the page currently publishes registration-open timing and state → location **links**, not ~115 dated events. Do not fan out to university hosts. Keep as a reference directory unless DOE itself prints exact regional dates.

## Schema and ops (do not block on this)

- Licensing is already **per source** (`permissionBasis`, `automationState`, kill switch, cadence) in `lib/ingestion-sources.ts`. A `source_license` column on every row is unnecessary.
- Scrapers never invent qualification ladders. Curated `series` + `qualification_rules` already exist; chess-only enrichment today.
- Submission programs already use `details.date_semantics = "submission_deadline"` (AFSA, Congressional App Challenge).
- CTE volume is real and maps onto existing Engineering / Computer Science / Speech facets. That is a **product** decision (fifth nav vs tags), not a 50-state scraper. Same policy as USCF state affiliates: directory first.
- Do not ingest secondary aggregators (sciencefair.io, TeenLife, ICS, AoPS, NewPages) or tenant software (Scienteer, zFairs).

## Corrected build order

1. Send the P1 letters (Tabroom, Scholastic, MATHCOUNTS, FIRST).
2. Do not code Tabroom, SpeechWire, Debate Land, RobotEvents, FIRST API, Devpost, MLH, CTFtime, Codeforces, Scholastic, MATHCOUNTS, Find-a-Fair, Science Olympiad, Poetry Out Loud, or USACO.
3. One DOE-style adapter at a time after robots + terms + `permissionReviewedOn`. Next candidate after Congressional App Challenge: Hack Club Hackathons JSON, with the restrictions above.
4. Keep the 50-state / CTE / NAfME / EdTA chapter layer as a directory until there is one written policy for affiliate scraping.
