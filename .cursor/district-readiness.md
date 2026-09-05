# District-program readiness

Living backlog for the school-district buyer. Club/team work lives in `club-readiness.md`. Catalog: `docs/district-feature-overview.md`.

## Verdict (2026-09-01)

Causey can run an **assisted chess district pilot**: platform-created district, child schools, claim-link staffing, family RSVP, aggregate reports, district vs school hosted events, district-office announcements that fan out to connected schools, school-safe roster/manage composition, district-hosted manage replies labeled by connected school, Schools settings that surface the same readiness next actions as the command center, and Family/Plan/Orgs chrome that says School when the student is on a school roster. It is not self-serve procurement and not a finished FERPA/price package.

## Have (ready enough for a chess pilot with Causey ops)

- District → school hierarchy, readiness command center, ownership handoff
- Role split (district admin, school admin, coach, assistant, parent, student)
- Audiences: public / district-only / school-only / invite-only
- Competitions inventory with host filter across district + schools
- Family desk, alerts (in-app; email configured not volume-proven); linked parents get invite/change/result/announcement copies
- Reports + CSV (school-hosted vs district-hosted split, type filter, participating-school origin); scoped Activity
- Announcements including district → child schools

## Need for a district that wants school tournaments (priority)

- [x] After schools are ready, next action is **run/review competitions**, not “stare at empty reports” — 2026-08-24
- [x] Command center shows **upcoming district + school events** with host names — 2026-08-24
- [x] Guided multi-school invite to a district-hosted event — 2026-08-24
- [x] Family/Alerts use the parent timezone; stored alerts include child 7-day/1-day and recorded results — 2026-08-26
- [x] Desktop home samples real nearby/photo listings; event pages take comments; zip/location capture on signup and landings — 2026-08-26
- [x] Phone homepage hero is a page-width form (3+2 type tiles) so Find + Search stay on the first screen — 2026-08-26
- [x] Phone discovery is search-first: directory pages search before filters; home uses type tiles — 2026-08-26
- [x] Homepage hero fills the remaining viewport; coverage is one scroll from the public pitch — 2026-08-26
- [x] `/districts` hero filled with setup steps; home organizer band pairs club + district without empty lanes — 2026-08-24
- [x] Home organizer district card is a School/District peer to clubs (same chassis, glanceable heading, assisted-pilot lede, planned-next lower deck) — 2026-08-26
- [x] District announcement fan-out to connected schools from the district overview — 2026-08-25
- [x] School-safe roster/manage composition: invite → group → competitions; progressive group edit; manage replies by status; group-first invites — 2026-08-27
- [x] Home organizer board: district path is unmissable — massive sliding Club/District window switch (drag or click, midpoint live-switch) with a sheen prompt on the district half until tried — 2026-08-27
- [x] District-hosted manage replies name each connected school (sorted by school) and surface unfinished organizer registration on going rows — 2026-08-29
- [x] District Schools settings (`#schools`) shows readiness next actions (same model as overview), not verification-only labels — 2026-08-31
- [x] Family/Plan/Orgs/school history use School nouns for school students (not club-first leftovers) — 2026-09-01
- [x] Account grade help, homepage My tournaments empty states, search org-going chip, and event teammate heading use school/club nouns from memberships — 2026-09-03
- [x] Unauthorized school hitchhike blocked; district rollup and invite-all no longer cartesian; invitation mail flushes without waiting for the reminder sweep (`0069`) — 2026-09-02
- [x] Type-sliced district Reports/CSV plus participating-school origin on district-hosted invites (`0070`) — 2026-09-02
- [x] CSV staff invites use one set-based RPC; restore-drill runbook names Pro backups, PITR-off, and verify steps without claiming a logged drill — 2026-09-02
- [x] January story copy: shared `/orgs` workspace, chess working surface, other types hostable, not custom portals — 2026-09-02
- [x] Club SaaS billing is a local layout only (`/billing`); districts stay meeting-booked — 2026-09-02
- [x] Finding tournaments no longer shows “too often” when the limiter RPC errors or a signed-in search sent a `user:` key `0069` rejects — 2026-09-04
- [x] Host a competition preview shows the real search card and event-page start (not a fact dump) — 2026-09-04
- [x] Host a competition requires type plus a visible discipline chip (same catalog as search); no silent chess default — 2026-09-04
- [x] Staff team-entry: coaches and school admins mark a student going / not going on Manage event (`0076`); audited `response_source = staff`; student + linked parents notified; Family labels staff entry — 2026-09-05
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
| Add school → invite named admin → claim → ownership; district retains authority | **works** | `createDistrictSchool` / `0045`; `/orgs/[slug]/settings#schools` readiness actions; `/people`; ownership settings; effective-org authority tests |
| Command center: one next action + per-school readiness | **works** | `lib/district-readiness.ts` → `run_competitions`; `/orgs/[slug]` school list |
| N=2 isolation (readiness/reports/CSV/activity) | **works** in repo; live env still ops-gated | `tests/multi-district-isolation.test.ts`; runbook §7 |
| School chrome says School account | **works** | `components/OrgSubnav.tsx`; Family/Plan/Orgs/`membershipHistoryEyebrow` type-aware nouns |
| School roster / groups / CSV / join link; assistants read-only | **works** | `/orgs/[slug]/roster`, `/people`; coach mission read-only branch |
| District can host district-wide or leave host with a school | **works** | `/orgs/[slug]/competitions/new` host chooser |
| Competitions inventory + host filter across district + schools | **works** | `getOrgCompetitionWorkspace`; `/orgs/[slug]/competitions` |
| District-only audience hierarchy + public review | **works** | `0057` + `lib/competition-audience.ts`; publish/review panels |
| Overview calendar of school + district events | **works** | `/orgs/[slug]` “Upcoming across the district” (prior tick) |
| Reports + CSV school- vs district-hosted; fail closed | **works** | `/orgs/[slug]/reports` + `export/route.ts`; `0046`; type filter + origin-school table (`0070`); school attendance fails closed |
| District-hosted invite of connected-school students | **works** | manage loads child-school rosters; `inviteConnectedSchoolRosters`; `origin_org_id` stamped (`0070`) |
| Claim-link provisioning | **works** | Email or copyable invite; CSV import via `create_org_invitations`; reissue |
| Activity feed scoped | **works** | `/orgs/[slug]/activity`; `0060` |
| Family RSVP + organizer registration | **works** | `/family` (org-agnostic RSVP copy) |
| School roster / manage composition | **works** | progressive groups; status-grouped replies; group-first invite picks |
| District-hosted reply follow-up by school | **works** | manage labels RSVP/attendance rows with connected-school name; sorts by school; going rows show organizer-registration status |
| District announcement one-shot to all child schools | **works** | overview `AnnouncementForm` audience `connected_schools`; action inserts per school + district copy (`0043` operator access) |
| Email at school volume | **ops / not proven** | backlog; not a UI claim on `/districts` |
| `/districts` pitch honesty | **works** | assisted pilot; book conversation; no partner names |

### Ranked friction (district chess program)

1. **P0 · District-hosted manage cannot invite school students · L · shipped 2026-08-24**  
   Surface: `/event/[slug]/manage` + `inviteConnectedSchoolRosters`. Connected-school rosters/groups load; “Invite every connected school” fans out.  
2. **P1 · Family desk still says “Club RSVPs” · S · shipped 2026-08-24** (metadata club wording cleared 2026-08-27)
3. **P1 · District announcement form does not fan out to child schools · M · shipped 2026-08-25**  
   Surface: district overview audience chooser; default posts to every connected school + district staff copy.
4. **P1 · Roster / manage still feel like admin tables · M · shipped 2026-08-27**  
   Surface: roster progressive groups + student group labels; manage replies by awaiting/going/can’t-go; individual invite picks demoted when groups exist.

5. **P0 · District-hosted manage replies hide school · S–M · shipped 2026-08-29**  
   Surface: `/event/[slug]/manage` reply rows now include connected-school name, school-then-name sort, and organizer-registration follow-up on going rows.

6. **P1 · District Schools tab shows verification only · M · shipped 2026-08-31**  
   Surface: `/orgs/[slug]/settings#schools` now loads `getDistrictPilotReadiness` and lists invite/handoff/provision/ready actions with fail-closed retry.

7. **P1 · Family/school chrome still club-first · S–M · shipped 2026-09-01**  
   Surface: Family mission/membership empty copy; Plan + student Orgs derive school/club/org chrome from memberships; roster history eyebrow uses `membershipHistoryEyebrow`.

8. **Ops · Email volume + live dual-district smoke · —**  
   Drain and invitation flush shipped 2026-09-02 (`0069` + 5-minute cron). Still apply migrations and prove volume in the live env. Keep FERPA/price as Legal/Ops.

9. **Legal · Price / FERPA / retention / public school directory · —**  
   Out of scope for build; refuse.

10. **P0 · Staff invitations were broken on any project that applied `0070` · S · shipped 2026-09-04**  
   `0070` recreated `create_org_invitation` with `search_path = public`, reverting the extension path `0030` set, so `gen_random_bytes` failed and no district or school administrator could be invited. Migration `0074` restores it. Apply `0074` before onboarding anyone.

11. **P1 · Contract-to-access handoff was a multi-step ops task · M · shipped 2026-09-04**  
   Surface: `/admin/organizations` → Provision district. One super-admin action creates the district, invites its first administrator, and returns a claim link plus a typable activation code (`0074`). `/claim` accepts the code; login/signup keep the staff persona for code claims.

12. **P1 · Guardian linking was silent and one-way · M · shipped 2026-09-04**  
   Surface: student Plan/Account family rows are direction-aware and carry an "Ask a parent to link" form with a copyable parent-signup handoff; `/family#requests` gives the parent an inbox for student-opened requests. `0075` adds `household_links.requested_by`, so the participant who opened a request can never accept it — enforced in both the update policy and the new `respond_to_household_link` RPC. Both directions notify the other side, and acceptance notifies whoever asked. A parent still cannot confirm a student exists by guessing an email; a student-opened request is the only case where a pending counterpart becomes visible, because the student is disclosing their own name. `0075` also allowlists the `comment` and `geo` rate-limit buckets `0062` omitted.

13. **P4 · Chess federation pin was missing · M · shipped 2026-09-05**  
   Surface: `/chess` results and the homepage chess rail now have a labeled “Get your kid to chess nationals” placement into `/pathways`. Uses seeded Denker/Barber/Rockefeller/Haring chains. Not an official US Chess ruling; swap copy when they send written pathway info.

14. **P5 · Staff could not mark a student going · M · shipped 2026-09-05**  
   Surface: `/event/[slug]/manage` replies now offer Mark going / Can’t go for coaches and school admins. Migration `0076` audits `response_source = staff` + `responded_by`, notifies the student and linked parents, and keeps assistants read-only. Family desk labels “Marked by staff.” Students and parents can still change the answer.

### Recommended next shippable win

Ops proof of email at school volume, and apply migrations through `0076` in each environment (`0074`–`0076` are hard gates — see the runbook). Defer to owner/legal gates — do not invent FERPA/price UI. Swap the P4 pathway copy when US Chess sends written rules.

### Out-of-scope refusals this pass

Self-serve district signup; FERPA/state-privacy certification; in-app payments / replacing organizer registration; central-office student browsing history; complete non-chess indexes as the pitch; messaging; pairing.
