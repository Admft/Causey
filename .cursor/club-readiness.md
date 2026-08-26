# Club-owner readiness

Living backlog for the club/team buyer. District hierarchy lives in `district-readiness.md`.

## Verdict (2026-08-24)

A coach can run a **coordination club**: roster, travel + hosted events, RSVP, attendance, typed results, family follow-through, season CSV. Causey is not a pairing engine, tab system, or dues product. Chess discovery is the densest; other types can be hosted with thinner public indexes.

## Have (ready enough for a real club season)

- Create club/team; join link; CSV/email staff+student invites; assistants
- Groups, announcements, member-only website + meeting note, leave club
- Public search + “My club is going”; mark club attending; teammate going list
- Host any listed type (draft → review → publish); club/team-only audience (not “school only”)
- RSVP, organizer-registration checkbox, attendance on hosted **and** travel events
- Record division/place/award; roster → club-scoped history; Plan/Family show blanks as not recorded
- Season report + CSV; grade + typed USCF/NSDA/other IDs on profile/roster

## Need for a professional club (priority)

- [x] Overview tells the owner to **record results** after attendance (not only invite/create) — 2026-08-24
- [x] Public `/clubs` scope ledger is one lifted white card: aligned can-do / not-building rows, display heads, lead/sm type, district note under the pair — 2026-08-26
- [x] Public `/clubs` and `/districts` pitches include a compact “All competition types” back control to the homepage chooser — 2026-08-26
- [x] Public club pitch at `/clubs` (peer to `/districts`): season path, honest out-of-scope, Create a club account — 2026-08-24
- [x] Season trophy board on overview (recorded places from Reports data) — 2026-08-24
- [x] Mid-season overview no longer says “Create your first competition” — 2026-08-24
- [x] Directory cards keep a source-logo cover when a listing has no photo, so mixed search rows stay aligned; club-hosted create still requires a cover — 2026-08-25
- [ ] Recurring practice night as a first-class object (today: meeting note string only)
- [ ] Email proven at club volume (wired, not load-tested)
- [ ] Owner/legal: public club directory, dues, messaging — see skill `out-of-scope.md`

## Out (do not build unless asked)

Needs for a professional club (not building unless you ask): recurring practice nights, a public club directory, live USCF/NSDA lookup, pairings/ballots, dues, coach–parent DMs.

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
