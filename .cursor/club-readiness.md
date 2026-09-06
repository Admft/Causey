# Club-owner readiness

Living backlog for the club/team buyer. District hierarchy lives in `district-readiness.md`.

## Verdict (2026-08-26 source walk)

A coach can run a **coordination club** once they are inside a club workspace: roster, travel + hosted events, RSVP, attendance, typed results, family follow-through, season CSV. `/clubs` → coach signup → create club/team (School is not self-serve). Causey is not a pairing engine, tab system, or dues product.

## Verdict (2026-08-24)

A coach can run a **coordination club**: roster, travel + hosted events, RSVP, attendance, typed results, family follow-through, season CSV. Causey is not a pairing engine, tab system, or dues product. Chess discovery is the densest; other types can be hosted with thinner public indexes.

## Have (ready enough for a real club season)

- Create club/team; join link; CSV/email staff+student invites; assistants
- Groups, announcements, member-only website + meeting note, leave club
- Public search + “My club is going”; mark club attending on website and phone (`BringRosterCard`); teammate going list (`ClubGoingCard`); phone Chess Pathways tool + nationals pin (sheen on the red banner)
- Host any listed type (draft → review → publish); club/team-only audience (not “school only”)
- RSVP, organizer-registration checkbox, attendance on hosted **and** travel events
- Hosted/travel manage shows an event pulse (invited / RSVP / unfinished registration / blank results) and People vs Listing
- Record division/place/award; roster → club-scoped history; Plan/Family show blanks as not recorded
- Season report + CSV; grade + typed USCF/NSDA/other IDs on profile/roster

## Need for a professional club (priority)

- [x] Phone Going / Can't go / Clear no longer lose the tap to a stale list reload — 2026-09-06
- [x] Parent invite → student Plan accept → parent Family confirm works on the phone the same way as the website; Going / Can't go can be unmarked (`0082`) — 2026-09-06
- [x] Phone Bring your roster is coach-only and falls back to the website when `/api/mobile/org-attendance` is not on that server; event Going distinguishes a club invite RSVP from public-listing family Going — 2026-09-06
- [x] Phone Family lists settled upcoming tournaments by name (Going / Can't go / registration complete) and opens the event; it no longer stops at "1 upcoming tournament" — 2026-09-06
- [x] Phone event page lets a coach Bring your roster / Mark club as going on a public listing (`GET/POST /api/mobile/org-attendance`); inviting students still opens website manage — 2026-09-06
- [x] Phone event details show the listing photo, US Chess rated/not rated, Going/Can't go, and “did you finish organizer registration?” after the organizer site; calendar falls back outside Expo Go — 2026-09-06
- [x] Support problem reports from `/support` with optional screenshot; founding-team email and Alerts replies — 2026-09-06
- [x] Phone Search is simple name/zip with Advanced search covering the website filters — 2026-09-06
- [x] Phone lists clubs/teams (and any school/district memberships) the signed-in account belongs to (`GET /api/mobile/orgs`); coaches open roster; no create/settings/CSV — 2026-09-05
- [x] Phone Alerts inbox shows the same invitation/RSVP/result rows as website `/me/notifications`; event pages open in-app, manage/orgs/account stay on the website — 2026-09-05
- [x] Phone event shows teammates who marked going (`/api/mobile/club-going` + `ClubGoingCard`), same groups as website `getClubGoing` — 2026-09-05
- [x] Tournament roster invite confirms saved invited rows (not the empty upsert body) so students and linked parents get Alerts — 2026-09-05
- [x] Overview tells the owner to **record results** after attendance (not only invite/create) — 2026-08-24
- [x] Homepage Find card has a My tournaments tab: sign-in returns here; signed-in preview of Going / traveling / hosted — 2026-08-26
- [x] Desktop home samples real nearby/photo listings; event pages take comments; zip/location capture on signup and landings — 2026-08-26
- [x] Phone homepage hero is a page-width form (3+2 type tiles with equal section graphics) so Find stays on one screen with My tournaments — 2026-08-26
- [x] Phone homepage is search-first: type tiles, optional zip, club/district as text links — 2026-08-26
- [x] Homepage hero fills the remaining viewport and a cue scrolls to what Causey indexes — 2026-08-26
- [x] Event manage workspace: pulse + People/Listing + cover re-upload on edit — 2026-08-26
- [x] Public `/clubs` and `/districts` pitches include a compact “All competition types” back control to the homepage chooser — 2026-08-26
- [x] Event travel control says “Bring your roster,” uses one org chooser, and excludes rosterless district offices — 2026-08-26
- [x] Public club pitch at `/clubs` (peer to `/districts`): season path, honest out-of-scope, Start a club → coach signup → `/orgs/new` — 2026-08-24 / create path 2026-09-02
- [x] Season trophy board on overview (recorded places from Reports data) — 2026-08-24
- [x] Mid-season overview no longer says “Create your first competition” — 2026-08-24
- [x] Directory cards keep a source-logo cover when a listing has no photo, so mixed search rows stay aligned; club-hosted create still requires a cover — 2026-08-25
- [ ] Recurring practice night as a first-class object (today: meeting note string only)
- [ ] Email proven at club volume (wired, not load-tested)
- [x] First-session club mission after roster leads travel clubs to search, not only “Create your first competition” — 2026-09-02
- [x] Create-club chrome: Club/Team copy, no School type, no “organization” H1 after `/clubs` — 2026-09-02
- [x] Competitions tab lists travel events the club marked as attending — 2026-09-02
- [x] Club/team People does not offer School administrator — 2026-09-02
- [x] Finding tournaments no longer shows “too often” when the limiter RPC errors or a signed-in search sent a `user:` key `0069` rejects — 2026-09-04
- [x] Host a competition preview shows the real search card and event-page start (not a fact dump) — 2026-09-04
- [x] Host a competition requires type plus a visible discipline chip (same catalog as search); no silent chess default — 2026-09-04
- [x] Club SaaS billing layout (Stripe Checkout, invoices, dunning, entitlements) at local `/billing` — 2026-09-03; checkout not connected, not on Vercel
- [ ] Owner/legal: public club directory, student dues, messaging — see skill `out-of-scope.md`

## Out (do not build unless asked)

Needs for a professional club (not building unless you ask): recurring practice nights, a public club directory, live USCF/NSDA lookup, pairings/ballots, student dues, coach–parent DMs. Club SaaS checkout is a local layout only (`/billing`).

## Findings — 2026-08-26 club-owner source walk

Persona: paid chess club / team owner, first-time coach. Source only (no live UI).

### Works (re-verified)
- `/clubs` season path + honest out-of-scope; home organizer chassis: club 01–04 spine beside school-district ledger, planned-next lower deck (`app/clubs/page.tsx`, `HomeDistrictPitch`)
- Create club/team without a district option (`OrgCreateForm` filters district)
- Join link, CSV/email invites, assistants, groups (`roster`, `JoinCodePanel`, `OrganizationPeopleManager`, `GroupManager`)
- “My club is going”, mark attending, teammate names (`SearchFilters`, `OrgAttendancePanel`, `getClubGoing`)
- Host draft → cover → Club/Team-only label → review/publish; .ics; edit/cancel (`TournamentCreateForm`, `event/[slug]/ics`, `CancelTournamentButton`)
- Attendance + results on hosted and travel manage; pulse; roster history; Plan/Family blanks (`manage`, `EntrantManager`, `roster/[profileId]`, `me`, `family`)
- Season report + CSV includes travel (`reports`, `reports/export`); overview “This season” + “Season is underway” after travel starts
- Announcements, leave club, member-only website/meeting note

### Remaining P0/P1
- Club owner · first session after roster · overview still “Create your first competition”; roster-ready CTA is Open competitions · chess clubs travel first · **P1 · M · shipped 2026-09-02** (Find a tournament for the roster)
- Club owner · `/orgs/new` + `/orgs` + AuthNav · “Start an organization”, School type, “Create a school or club”, nav “My organizations”/“Orgs” · `/clubs` promised a club · **P1 · S · shipped 2026-09-02**
- Club owner · People · role picker still offers School administrator; copy says “whole class” · **P1 · S · shipped 2026-09-02**
- Club owner · host publish · Club-only audience still submits as `school` and CTA “Publish to school” · **P1 · S · shipped 2026-09-02**
- Club owner · Competitions tab · hosted records only; travel lives on overview “We’re attending” and event pages · season walk splits · **P1 · M · shipped 2026-09-02**
- Club owner · email · outbox wired, not club-volume proven · **P1 · M**
- Club owner · practice nights · meeting_note string only · **P1 · L** (later / out unless asked)

### P2
- Event page coach panel title “Take your organization” (`OrgAttendancePanel`) — **shipped 2026-08-26** as roster-first copy and a single chooser; districts cannot be marked as traveling
- Settings type helper cites “district hierarchy”; H1 “Organization controls” — **shipped 2026-09-02** (Club/Team controls; club/team helper omits district hierarchy)
- Roster history eyebrow always “Club record” (teams included) — **shipped 2026-09-01** (`membershipHistoryEyebrow`)
- Result award placeholder “Broke to elims” (debate language on chess manage) — **shipped 2026-09-02** (`Trophy or honor`)

### Out (refused this pass)
Pairings/boards/clocks, Tabroom ballots, dues/Stripe, coach–parent DMs, public club directory / public `/u/` pages, LMS/Lichess, standings import.

## Findings — 2026-08-26

- Student / coach on the homepage · Find tournaments · no way to see Going / club-traveling events without leaving search · **M · shipping this tick**
- Student / coach on a phone · homepage · desktop copy, chips, and five tiny type icons compete with search · first job is unclear · **M · shipped 2026-08-26**
- Student on a phone · directory · filters sit above name/zip so the list is a long form before the first tournament · **M · shipping this tick**

## Findings — 2026-08-24

- Club owner · overview · after a tournament, mission still prefers create/invite; results live on manage/roster only · first-session miss · **M · shipping this tick**
- Club owner · reports/competitions eyebrows · “Reporting” / “Organization events” · club identity leak · **S · shipping this tick**
- Club owner · practice nights · not modeled · **L · later**
- Club owner · public homepage · member-only · **Out until legal**

## Findings — 2026-08-24 agent pass

Source walk only (no live UI). Persona: paid club/team owner, any competition type.

### Works (re-verified)
- Create club/team without district option in form (`app/orgs/new`, `components/OrgCreateForm`, `ORG_TYPE_OPTIONS` filters district)
- Join link + email/CSV invites + assistants (`roster`, `people`, `OrganizationPeopleManager`, `GroupManager`)
- Settings: rename, state, website, meeting note, ownership; type locked (`OrganizationSettingsForm`)
- “My club is going” + mark attending + teammate names (`SearchFilters`, `OrgAttendancePanel`, `getClubGoing` on event page)
- Host draft → audience Club/Team only → publish/review; .ics (`TournamentCreateForm`, `/event/[slug]/ics`)
- Attendance + results on hosted and travel manage; roster history; Plan/Family blanks (`manage`, `EntrantManager`, `roster/[profileId]`, `me`, `family`)
- Season report + CSV includes travel (`reports`, `reports/export`)
- Announcements, leave club, member-only website/meeting note on overview

### Remaining P0/P1
- Club owner · overview idle mission · after roster + recorded results with no upcoming/draft, still “Create your first competition” · mid-season dead end / hosts over discovery · **P1 · M · shipped 2026-08-24 (Season is underway)**
- Club owner · overview · no season trophy board (places/awards live on Reports only) · board/parent ask “who placed?” · **P1 · M · shipped 2026-08-24 (This season)**
- Club owner · practice nights · meeting_note string only · weekly ops not modeled · **P1 · L**
- Club owner · email · outbox wired, not club-volume proven · invite/announce trust · **P1 · M**
- Club owner · host audience helper · “District-only… after connected to a district” on club/team create · never true for clubs · **P1 · S · shipped 2026-08-24 (hidden unless school/district)**
- Club owner · reports body copy · hardcodes “this club” for team orgs · identity nits · **P1 · S · shipped 2026-08-24**

### Out (refused this pass)
Pairings/boards/clocks, Tabroom ballots, dues/Stripe, coach–parent DMs, public club directory / public `/u/` pages, LMS/Lichess, standings import.
