# District-program readiness

Living backlog for the school-district buyer. Club/team work lives in `club-readiness.md`. Catalog: `docs/district-feature-overview.md`.

## Verdict (2026-08-25)

Causey can run an **assisted chess district pilot**: platform-created district, child schools, claim-link staffing, family RSVP, aggregate reports, district vs school hosted events, and district-office announcements that fan out to connected schools. It is not self-serve procurement and not a finished FERPA/price package.

## Have (ready enough for a chess pilot with Causey ops)

- District → school hierarchy, readiness command center, ownership handoff
- Role split (district admin, school admin, coach, assistant, parent, student)
- Audiences: public / district-only / school-only / invite-only
- Competitions inventory with host filter across district + schools
- Family desk, alerts (in-app; email configured not volume-proven)
- Reports + CSV (school-hosted vs district-hosted split); scoped Activity
- Announcements including district → child schools

## Need for a district that wants school tournaments (priority)

- [x] After schools are ready, next action is **run/review competitions**, not “stare at empty reports” — 2026-08-24
- [x] Command center shows **upcoming district + school events** with host names — 2026-08-24
- [x] Guided multi-school invite to a district-hosted event — 2026-08-24
- [x] Phone discovery is search-first: directory pages search before filters; home uses type rows — 2026-08-26
- [x] Homepage hero fills the remaining viewport; coverage is one scroll from the public pitch — 2026-08-26
- [x] `/districts` hero filled with setup steps; home organizer band pairs club + district without empty lanes — 2026-08-24
- [x] District announcement fan-out to connected schools from the district overview — 2026-08-25
- [ ] Email proven at school volume
- [ ] Owner/legal: price, contract, FERPA/state privacy, retention, public school directory

## Out (do not promise)

Self-serve district signup, in-app payments, central-office student browsing, complete non-chess indexes, messaging, pairing.

## Findings — 2026-08-24

- District admin · overview · workspace events already load for districts but the command center never lists them · calendar miss for school tournaments · **M · shipping this tick**
- District admin · setup-complete mission · `review_reporting` sends to Reports before any event exists · **M · shipping this tick**
- District admin · district-hosted invite-all-schools · still per-roster · **L · later**
- Buyer · `/districts` · honest assisted-pilot pitch · keep

## Findings — 2026-08-24 agent pass

Source walk as district athletics coordinator (chess pilot). No app code edited.

### Workflow checklist (source)

| Area | Status | Evidence |
| --- | --- | --- |
| Platform provisions district; coach cannot self-serve | **works** | `0025` + `/admin/organizations`; `tests/district-lifecycle-guardrails.test.ts` |
| Add school → invite named admin → claim → ownership; district retains authority | **works** | `createDistrictSchool` / `0045`; `/orgs/[slug]/settings#schools`; `/people`; ownership settings; effective-org authority tests |
| Command center: one next action + per-school readiness | **works** | `lib/district-readiness.ts` → `run_competitions`; `/orgs/[slug]` school list |
| N=2 isolation (readiness/reports/CSV/activity) | **works** in repo; live env still ops-gated | `tests/multi-district-isolation.test.ts`; runbook §7 |
| School chrome says School account | **works** | `components/OrgSubnav.tsx` |
| School roster / groups / CSV / join link; assistants read-only | **works** | `/orgs/[slug]/roster`, `/people`; coach mission read-only branch |
| District can host district-wide or leave host with a school | **works** | `/orgs/[slug]/competitions/new` host chooser |
| Competitions inventory + host filter across district + schools | **works** | `getOrgCompetitionWorkspace`; `/orgs/[slug]/competitions` |
| District-only audience hierarchy + public review | **works** | `0057` + `lib/competition-audience.ts`; publish/review panels |
| Overview calendar of school + district events | **works** | `/orgs/[slug]` “Upcoming across the district” (prior tick) |
| Reports + CSV school- vs district-hosted; fail closed | **works** | `/orgs/[slug]/reports` + `export/route.ts`; `0046` |
| Activity feed scoped | **works** | `/orgs/[slug]/activity`; `0060` |
| Family RSVP + organizer registration | **works** (club-worded copy) | `/family` |
| District-hosted invite of connected-school students | **works** | manage loads child-school rosters; `inviteConnectedSchoolRosters` |
| District announcement one-shot to all child schools | **works** | overview `AnnouncementForm` audience `connected_schools`; action inserts per school + district copy (`0043` operator access) |
| Email at school volume | **ops / not proven** | backlog; not a UI claim on `/districts` |
| `/districts` pitch honesty | **works** | assisted pilot; book conversation; no partner names |

### Ranked friction (district chess program)

1. **P0 · District-hosted manage cannot invite school students · L · shipped 2026-08-24**  
   Surface: `/event/[slug]/manage` + `inviteConnectedSchoolRosters`. Connected-school rosters/groups load; “Invite every connected school” fans out.  
2. **P1 · Family desk still says “Club RSVPs” · S · shipped 2026-08-24**
3. **P1 · District announcement form does not fan out to child schools · M · shipped 2026-08-25**  
   Surface: district overview audience chooser; default posts to every connected school + district staff copy.

4. **Ops · Email volume + live dual-district smoke · —**  
   Not product UI. Keep as Legal/Ops; do not invent compliance UI.

5. **Legal · Price / FERPA / retention / public school directory · —**  
   Out of scope for build; refuse.

### Recommended next shippable win

**School-safe roster/manage composition**, or ops proof of email at school volume. Announcement fan-out shipped.

### Out-of-scope refusals this pass

Self-serve district signup; FERPA/state-privacy certification; in-app payments / replacing organizer registration; central-office student browsing history; complete non-chess indexes as the pitch; messaging; pairing.
