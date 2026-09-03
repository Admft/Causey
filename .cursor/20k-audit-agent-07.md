# Agent 7 — Paying club product

## Scope covered

Skill/backlog: `.cursor/skills/club-owner-readiness/SKILL.md`, `workflows.md`, `out-of-scope.md`, `.cursor/club-readiness.md`, `docs/club-feature-overview.md`

Routes: `app/clubs/page.tsx`, `app/orgs/new/page.tsx`, `app/orgs/page.tsx`, `app/orgs/[slug]/page.tsx`, `roster/page.tsx`, `roster/[profileId]/page.tsx`, `people/page.tsx`, `competitions/page.tsx`, `competitions/new/page.tsx`, `reports/page.tsx`, `reports/export/route.ts`, `settings/page.tsx`, `app/event/[slug]/page.tsx`, `manage/page.tsx`, `event/[slug]/ics/route.ts`, `app/account/page.tsx`, `app/signup/page.tsx`, `app/debate/page.tsx`

Components/lib: `OrgCreateForm`, `OrgSubnav`, `AuthNav`, `portal-copy`, `OrganizationPeopleManager`, `OrganizationSettingsForm`, `JoinCodePanel`, `TournamentCreateForm`, `PublishTournamentPanel`, `OrgAttendancePanel`, `EntrantManager` (`AttendanceButtons`, `ResultForm`), `EventPulseStrip`, `EventOrganizerSubnav`, `AnnouncementForm`, `SignupForm`, `SearchFilters`, `lib/actions/orgs.ts` (`createOrg`), `lib/data/portal.ts` (`getOrgCompetitionWorkspace`, `getOrgAttendedEvents`, `getClubGoing`, `isUpcomingEvent`), `lib/data/district.ts` (`getOrgSeasonAttendance`), `lib/data/home-my-tournaments.ts`, `supabase/migrations/0065_club_profile_org_about.sql` (`get_org_season_attendance`)

Not owned: Stripe checkout / entitlements (Agent 1). No live UI this pass (source only).

## Verdict

**Partial.** A paying coach can run the coordination season once they are inside a club: create club/team, join link + CSV, groups, mark “club is going,” invite/RSVP, host draft → publish, record attendance/place/award, roster history, Family/Plan blanks, season CSV with travel rows. Chess search is the densest listing surface. That is not a monthly product a club owner would keep without friction: `/clubs` still dumps them into School/organization chrome, the Competitions tab is hosted-only, **past travel events disappear from the workspace before day-of attendance can be finished**, attendance UI waits until the calendar date has passed, and practice nights / public directory / pairings / dues remain missing while `/clubs` still says “No billing or Stripe.” At 20k, those gaps churn a coach who is paying Causey, not the tournament organizer.

## Keep

- `/clubs` season path and honest out-of-scope list (`app/clubs/page.tsx`)
- Create club/team without a district option (`OrgCreateForm` + `createOrg` type enum)
- Join code, CSV claim links, assistants, groups (`JoinCodePanel`, `OrganizationPeopleManager`, `GroupManager`)
- “My club is going” live filter, mark attending, teammate names (`SearchFilters`, `OrgAttendancePanel`, `getClubGoing`)
- Host draft → cover → audience → review/publish; private immediate; public waits for review; `.ics` (`TournamentCreateForm`, `PublishTournamentPanel`, `app/event/[slug]/ics/route.ts`)
- Event manage pulse + People/Listing (`EventPulseStrip`, `EventOrganizerSubnav`)
- Typed results + club-scoped history; Plan/Family treat blank as not recorded (`ResultForm`, `roster/[profileId]`)
- Overview “This season” + “Season is underway” / record-results mission when attendance already exists
- Season CSV columns include Hosted or travel (`reports/export/route.ts`)
- Announcements, member-only website + meeting note, leave-club, ownership transfer

## Findings

1. Overview / Competitions / Home · Past travel events leave the workspace · After the end date, `attendingUpcoming` and `getHomeMyTournaments` both filter with `isUpcomingEvent` (`end_date >= today`); `getOrgCompetitionWorkspace` only loads hosted `competitions.org_id`. A coach who marked the club going cannot open manage from Overview, Competitions, or My tournaments to mark attendance or results. Season CSV stays empty until they hunt the public event URL. Breaks the paid job: travel → day-of → CSV. · **P0 · M**

2. Event manage · Day-of attendance is locked until tomorrow · `isPast` is `(end_date ?? start_date) < today` in `app/event/[slug]/manage/page.tsx`; `AttendanceButtons` / `ResultForm` only render in that branch. On event day the mission is still RSVP. Skill walk is “day-of: attendance, then record place/award.” · **P1 · S**

3. `/clubs` → `/signup?role=coach` → `/orgs` / `/orgs/new` / AuthNav / Account · Club pitch, then School/organization chrome · `/orgs/new` H1 “Start an organization,” still offers School (`ORG_TYPE_OPTIONS`); staff `/orgs` H1 “Your organizations”; nav `organizationNavLabels` → “My organizations” / “Orgs”; Account “Create another organization.” Paying buyer from `/clubs` feels bait-and-switched. · **P1 · S**

4. Roster ready + empty-season overview · First session still pushes **host**, not find · Roster-ready CTA is `OPEN_COMPETITIONS_LABEL` → hosted list (`roster/page.tsx`). After students exist and no hosted/upcoming/travel, overview falls through to “Create your first competition” (`app/orgs/[slug]/page.tsx` `coachMission`). Chess clubs that pay for travel coordination hit create-event instead of `/#search`. · **P1 · M**

5. People · Club/team role picker includes School administrator · `OrganizationPeopleManager.availableRoles` only strips `district_admin` for non-district orgs; `invitationRoleFitsOrganization("club", "school_admin")` is true. Helper copy: “For a whole class, share the roster join link.” A chess club can mint a school-admin. · **P1 · S**

6. Host publish · Club-only still submits as `audience: "school"` and CTA “Publish to school” · `TournamentCreateForm` relabels the option “Club only” / “Team only” but `publishLabel` uses `audience === "school"` → “Publish to school”; `competitions/new` `defaultAudience` is `"school"` for clubs. · **P1 · S**

7. Practice nights · Not a first-class object · Settings `meeting_note` is a 280-character string (`OrganizationSettingsForm`); overview prints it as a line. `/clubs` already lists this as not included. A monthly club’s weekly job is practice, then weekend travel. Without a schedule, Causey is a tournament clipboard they open twice a month. · **P1 · L** (customer-unfinished; stay out of pairings/LMS)

8. Public club directory · `/clubs` is a pitch, not a city directory · No club search, no public homepage, website is member-only (`OrganizationSettingsForm` helper). Recruiting families is why many clubs would pay. Legal may still forbid a directory; the product still looks unfinished to a paying owner. · **P1 · L**

9. Reports / CSV · “Season” is Jan 1–today; RPC errors look like zero attendance · `get_org_season_attendance` filters `start_date >= make_date(current year, 1, 1)`; `getOrgSeasonAttendance` returns `[]` on error. Club Reports has no `PortalErrorState` (district does). School-year seasons lose last fall on 1 Jan; a failed export looks like “nobody went.” Reports page is `isAdmin`-only; invited `coach` staff cannot download the board CSV. · **P1 · M**

10. Event manage RSVP rows · Unfinished organizer registration is pulse-only · `buildEventPulse` counts unfinished registration; the People list shows RSVP/attendance/result, not `registration_status`. Coach cannot chase who still owes Chess.com/US Chess entry. At 20–60 kids that is the paid follow-through job. No bulk attendance either. · **P1 · M**

11. Roster · Typed USCF/NSDA IDs are not on the roster list; no live lookup; no name-only roster · `RosterRow.credential_ids` exists; `roster/page.tsx` shows age/grade/groups only. IDs appear on `roster/[profileId]` after the student edits `ProfileEditor`. Every student must create a Causey account (`JoinCodePanel` / claim email). Check-in and a 40-kid email-less roster are still spreadsheets. Live MSA/NSDA stays out of scope; the typed-ID surface is still half-built. · **P1 · M**

12. Settings / history / results chrome · Club identity leaks and debate copy on chess · Settings H1 “Organization controls”; type helper “district hierarchy” (`OrganizationSettingsForm`, `settings/page.tsx`). History eyebrow always “Club record” (`roster/[profileId]/page.tsx`) including teams. `ResultForm` award placeholder `"Broke to elims"`. Small, but it is what a paying coach stares at after every tournament. · **P2 · S**

13. Customer-expectation risks (do not build unless asked; will still cause churn) · Pairings/boards, dues collection, coach–parent DMs, live rating lookup · `/clubs` `notIncluded` is honest, but monthly SaaS buyers compare Causey to SwissSys + a Venmo list + GroupMe. Pitch line “No billing or Stripe. Fees stay on the organizer’s site” also collides with **club** SaaS checkout (Agent 1). Non-chess clubs: hosting works; `/debate`, `/stem`, `/arts`, `/writing` indexes stay thin (`CategoryDiscoveryPage`). Custom types: public link after review, no directory (`TournamentCreateForm`). Email invites/announcements are wired, not club-volume proven (Agent 6). New orgs default `verification_status = 'pending'` and show “Platform review pending” with nothing to submit (`app/orgs/[slug]/page.tsx`) — at 20k that banner is permanent noise. · **P1 · L** (expectation / copy / ops)

## Must-build before go-live

1. **Club-native chrome** after `/clubs`: `/orgs/new` and `/orgs` H1s, AuthNav/Account labels, hide School on the club create path, People roles without School administrator, publish CTA “Publish to club/team,” settings “Club/Team controls” without district-hierarchy helper.
2. **One season list**: Competitions (and overview) include travel the club marked as attending, including **past** events, each with Manage for attendance/results.
3. **Day-of attendance**: treat event day as operable (`isPast` / mission), not RSVP-only until tomorrow.
4. **Post-roster mission** for travel clubs: Search tournaments as the primary next step when there is no hosted draft/upcoming, not “Create your first competition.”
5. **Season file a board can use**: selectable season window (or school year), visible error if the RPC fails, export available to operating coaches (not only org admin/owner).
6. **Manage follow-through**: per-student unfinished organizer registration on the People list; bulk mark attended/not for the going column.
7. **Roster that matches check-in**: show typed USCF/NSDA/other on the roster; do not require opening history; keep live MSA out.
8. **Paid-scope honesty in-product** (not only `/clubs`): meeting note is not a practice calendar; no public directory; families still pay the organizer. If monthly price implies weekly ops, ship a thin recurring practice object or keep charging only for season coordination and say so in the workspace, not only the marketing page.

## Open questions for the owner

- Does the monthly club price include **practice nights**, or is Causey sold strictly as travel/host/results? That fork decides whether finding 7 is P0 or a documented out.
- Public **club directory**: legal/privacy vs recruiting. Until that is decided, do not imply “find a club near you.”
- Season definition for CSV: calendar year vs Sep–May vs coach-picked range. Boards will ask.
- Self-serve club **identity verification**: keep pending-forever, skip for clubs, or a real submit path? At 20k the current banner does not scale.
- Pairings / student dues: never, or a later paid add-on? `/clubs` must not say “no Stripe” if club SaaS checkout exists.
