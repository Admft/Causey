# Agent 5 — Data plane at 20k

## Scope covered
- `.cursor/20k-full-audit-roles.md`, `.cursor/district-ux-progress.md` (20k hardening note)
- `lib/data/supabase.ts`, `lib/data/search.ts`, `lib/data/home-featured.ts`, `lib/data/portal.ts`, `lib/data/district.ts`, `lib/data/admin.ts`, `lib/data/competition-comments.ts`
- `app/api/competitions/route.ts`, `app/api/competitions/[slug]/route.ts`, `app/api/geo/nearest-zip/route.ts`
- `lib/schemas.ts` (page size), `lib/rate-limit.ts`, `lib/actions/district.ts` (CSV), `lib/actions/comments.ts`, `proxy.ts`, `components/SearchClient.tsx`
- `supabase/migrations/0001_init.sql`, `0004`, `0010`, `0012`, `0013`, `0016_search_interest_ranking.sql`, `0017`, `0018`, `0041`, `0046`, `0061`, `0062`, `0066`, `0067`, `0068`
- `ingestion/README.md`, `ingestion/scrape-all.ts`, `ingestion/scrape-tla.ts`, `ingestion/persist.ts`, `ingestion/rehost-cover.ts`, `ingestion/fetch-html.ts`, `lib/ingestion-sources.ts`
- `app/admin/scrapers/page.tsx`, `.github/workflows/ingest.yml`
- Tests: `tests/radius-search.test.ts`, `tests/pathway-csv-cache.test.ts`, `tests/public-path-hardening.test.ts`

## Verdict
**Partial.** The 2026-08-24 20k hardening is real: zip search is an earthdistance RPC (`0061`, hard cap 200), public `limit` max is 100, anonymous search sends `s-maxage=60, stale-while-revalidate=300`, and `0062`/`0066` rate-limit search at **60/min per hashed IP**. That is enough for cookie-less chess browsing of the current catalog. It is **not** enough for ~20k **signed-in** students/parents/coaches (paid clubs and school staff), who skip the CDN cache, trigger a 4–6 extra membership queries, and drop radius search into a 200-row JS window. District hosting then hits unbounded workspace lists, a cartesian report join, and CSV invites that are still one RPC per person. Custom district portals have **no** separate search index, cache key, or connection plane — unknown / fail-closed as a data-plane capability.

## Keep
- `search_competitions_in_radius` (`0061`): GiST `earth_box` + `earth_distance`, `security invoker`, online-without-coords included, SQL `limit least(..., 200)`.
- Public page sizes 20 / 50 / 100; schema rejects `limit > 100` (`SEARCH_PUBLIC_MAX_LIMIT`).
- SQL fast path for unfiltered popular/soonest (no `q` / sections / featured / club_going): `.range` + `count: "exact"` + `competitions_interest_start_idx` / `competitions_category_status_start_idx`.
- `competitions_lat_lng_idx` GiST, `competitions_name_trgm_idx`, `zips` PK + `zips_earth_idx`, `competitions_org_idx`.
- Anonymous public GET skip of session refresh (`proxy.ts`); pathway picker uses `listPathwayCompetitionRefs` (not the unused full chess dump).
- Qualification-rules memory cache, 5 minutes.
- Ingestion: stage-then-persist `scrape:all`, upsert batches of 200, section replace RPC, `scrape_runs` + fail-closed admin health, workflow concurrency group, 90-minute job timeout.
- Cover copy into public `tournament-covers` (5 MB jpeg/png/webp) so signed Google/Facebook URLs do not 403.
- CSV: 500-row file cap, `csv.string().max(500_000)`, `csv_import` 3/min, `INVITE_CONCURRENCY = 20`.

## Findings
1. Signed-in zip search · `searchByRadius` sets `needsJsWindow` whenever `preferredOrgIds.size > 0` (any club/school membership) · RPC always `p_limit = RADIUS_SCAN_CAP` (200) from offset 0; JS then `paginateResults` and **`total = results.length` (the 200-window), not `total_count`** · Paying club coaches and district staff are exactly the users who hit this on every chess zip search · **P0** · **M**

2. Search rate limit · `lib/rate-limit.ts` `search: { max: 60, windowSeconds: 60 }` keyed by IP SHA-256 for anonymous (and hashed user when signed in) · One school or district NAT can 429 a classroom of simultaneous `/chess` searches; the limit is a **code constant**, not a measured QPS · **P0** · **S**

3. Rate-limit write on the hot path · Every origin `GET /api/competitions` calls `consume_rate_limit` **before** search; `rate_limit_buckets` has **no prune/TTL** · Cache cannot absorb that write; table grows with `(bucket, actor_key, window_start)` forever · **P1** · **S**

4. Anonymous cache is narrow · `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` only when no `*-auth-token` cookie; signed-in is `private, no-store`; route is `force-dynamic` · Zip/radius/offset/q fragment the cache; 20k logged-in users never share it; `getZip` also runs twice (route + `searchCompetitions`) · **P1** · **S**

5. Slow path still downloads then filters in JS · `q`, grade/rating/fee, `facet`, `featured`, `club_going` skip SQL paging (`hasSectionFilters` / `canPageInSql`) · No `.range`; PostgREST default max-rows in-repo is **unknown / fail-closed** (typically 1000 if unchanged) · Facets live in `details` jsonb with **no GIN** · Keyword uses `ILIKE '%q%'` (trgm can help; leading wildcard still scans) · **P1** · **M**

6. Signed-in query amplification (N+1 shape) · `preferredOrgIds`: auth + memberships + owned orgs + parents + children; `clubGoingCompetitionIds` selects **all** `org_competition_attendance` for those orgs with no limit · Popular SQL path with member boost: `.range(0, offset+limit-1)` plus **unbounded** `.in("org_id", preferredOrgIds)` · Nested `select("*, sections(*), series(*)")` on every hit · **P1** · **M**

7. Nested embed + exact count · Fast path `count: "exact"` on `competitions` with `sections(*)` and `series(*)` · Radius RPC also `count(*) over()` over the full filtered set **every page** · Fine at a few thousand published chess rows; gets expensive as school-hosted public events share the same table · **P1** · **M**

8. District report join · `get_district_school_rollup` (`0018`) is `schools ⟕ memberships ⟕ competitions ⟕ entrants` then `GROUP BY school` · Row explosion is `|students| × |school events| × |entrants|` per school · This is what breaks first when districts **host**, not when they only search · **P0** · **L**

9. CSV bulk invites are still per-row RPCs · Cap 500 people, 20-way `Promise.all` around `create_org_invitation`; each call `createServerSupabaseClient()` · No `maxDuration` on the server action (email cron is the only route with `maxDuration = 60`) · `csv_import` 3/min · A real high-school or district roster import can time out or stall the People page; claim tokens for 500 rows are returned to the browser · **P0** · **L**

10. Org/district event lists are unpaged · `getOrgWorkspaceEvents` / child-school `competitions` + `tournament_drafts` have **no `.range`**; `getOrgAttendedEvents` and `getMyEntrantRows` likewise · PostgREST silent truncation is **unknown / fail-closed** · Custom portals hanging off this shell inherit the dump · **P1** · **M**

11. Chess ingestion has no volume gate · TLA/CCA/OnlineReg/Chess-Results/FIDE/TCA `expectedRows: null`; non-chess sources are capped (e.g. UIL speech 1–100) · TLA: `SCRAPE_MAX_PAGES` default **40**, sequential detail fetches (`FETCH_TIMEOUT_MS` 12s, listing sleep 200ms), then cover `mapLimit(..., 3)` of up to **5 MB** each · GitHub job `timeout-minutes: 90`, sequential `scrape:all` then `scrape:discovery` · Chess catalog growth or cover rehost is what blows the scrape, not 20k user QPS · **P1** · **L**

12. Cover storage · Public `tournament-covers` (`0017`/`0021`/`0067`), 5 MB/object, scrape path `scraped/{source}/{id}.ext`, org path `{orgId}/{draftOrCompetitionId}/…` · No lifecycle/orphan delete in ingest; ephemeral Google/Facebook URLs still require rehost while the token lives · At TLA-sized catalogs this is storage + scrape-time, not search QPS · **P2** · **M**

13. Radius knobs vs index · `radius_miles` schema **max 3000**; RPC `OR` online-without-coords can defeat a pure GiST plan; `0001` still comments “a few thousand rows” · No composite (category, status, earth) index · Homepage nearby strip (`HOME_FEATURED_POOL` 48, radius 75) reuses the same radius path · **P2** · **M**

14. Custom district portals / paid-club isolation in the data plane · One `competitions` table, one radius RPC granted to `anon, authenticated`, one global anonymous cache key · No per-district search catalog, replica, or cache partition in repo · School-hosted **public** chess events share the TLA index; district-audience rows depend on RLS (Agent 4) · **Missing** for target (3) · **P1** · **L**

15. Offset unbounded · `offset` is nonnegative with **no max**; combined with (1) page 3+ of a filtered zip search is empty/wrong · **P2** · **S**

## Must-build before go-live
1. Keep member-org boost / section / facet / club-going **in SQL** (or a second indexed query) so signed-in zip search never uses the 200-row JS window; return RPC `total_count` as `total`.
2. Search abuse: NAT-aware or per-user search buckets; prune `rate_limit_buckets`; do not require a PK upsert to serve a cached anonymous page.
3. Cap `offset`; never issue an unpaged `competitions` + `sections(*)` select; push grade/rating/fee/facet into SQL (GIN on `details` or generated columns).
4. One-shot `create_org_invitations` RPC (set-based) for CSV; set an explicit server-action time budget; keep the 500/file and 3/min caps documented as product limits.
5. Rewrite `get_district_school_rollup` as per-school grouped subqueries (same honesty as `get_district_hosted_rollup`); page org/district event and attendance lists.
6. Give TLA (and other chess hubs) an `expectedRows` max, a cover-rehost budget, and scrape-run alerting before the 90-minute GitHub timeout; keep sequential politeness.
7. Cover lifecycle: skip unchanged hosted URLs, delete orphaned `scraped/` objects, fail closed when rehost fails rather than storing dead tokens.
8. If custom district portals ship: define whether they share the global chess index or get a tenant-scoped search/cache key — do not assume the current RPC is enough.

## Open questions for the owner
- Personalized rank (member-org boost, “my club is going”) vs a shared CDN cache: which is the 20k search SLA?
- Are custom district portals allowed to share the global public chess catalog, or must search/cache be tenant-keyed?
- Real roster import size vs the coded 500/file and 3 CSV imports/min — if districts exceed 500, the current action cannot be the go-live path.
- Hosted PostgREST `max_rows` / pooler settings are **unknown** in this repo; confirm in the live project before treating unpaged lists as safe.
