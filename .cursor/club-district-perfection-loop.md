# Club + district + account-access loop

Specialist agents share one loop. Stop when the user says stop, or when three consecutive ticks find no P0/P1 gap that would change a first-session club-owner, district-office, or account-access decision.

## Agents

| Agent | Skill | Backlog | Catalog |
| --- | --- | --- | --- |
| Club owner | `.cursor/skills/club-owner-readiness/` | `.cursor/club-readiness.md` | `docs/club-feature-overview.md` |
| District program | `.cursor/skills/district-program-readiness/` | `.cursor/district-readiness.md` | `docs/district-feature-overview.md` |
| Account access | `.cursor/skills/account-access-customizability/` | `.cursor/account-access-readiness.md` | skill `account-types.md` + `access-grants.md` |

Emulate **that buyer** before coding. Do not mix club IA into district chrome or district hierarchy into a club. Account-access ticks walk **every account type on one workflow** (customizability, missing features, grant-only-certain-access) — they do not invent Salesforce ACLs or a fourth signup type.

## Hard rules

- Branch `dev` only. Never checkout/merge/push `main`.
- One focused, shippable workflow win per tick (whole job, not a label).
- Design system + anti-vibecode. No fake polish. No fabricated listings or partner names.
- Prefer reuse. Do not invent scrape paths.
- Update this file’s **Active batch**, the matching readiness backlog, and `.cursor/district-ux-progress.md`.

## Tick protocol

1. **Pick a persona** (club owner, district program, *or* one account-access workflow agent). Read that skill + backlog + catalog.
2. **Walk the skill’s workflow checklist** against routes/source (and live UI when a server is up).
3. Write **5–12 findings** into that persona’s backlog (surface · gap · why it hurts · size). Account-access ticks also score Enough / Thin / Missing / Over-grant per type.
4. Lock **one Active batch** below. Reject chrome-only batches.
5. Ship the batch. Run relevant tests. Do not commit unless the user asked.
6. Refresh the catalog table if a feature moved Ready / Partial / Missing / Out.

## Active batch

- Restore signed-out tournament search: unpublished-manager SELECT
  policies must not call `is_org_coach` for anon — 2026-09-14

## Last tick

- 2026-09-14 — Signed-out search 500ed on causey.dev (`permission denied
  for function is_org_coach`) while a signed-in session on this machine
  still worked. Live unpublished-manager policies on competitions/sections
  were still PUBLIC; `0106` scopes them to authenticated using
  `can_operate_org_competitions`.
- 2026-09-14 — Walked other account-type landings for the same class of
  lie as “Delegate this school.” School overview no longer pins district
  ownership handoff as the admin’s mission; Plan copy follows membership
  role (office vs assigned-group vs district competitions); /orgs empty
  state, competitions empty copy, join-code nouns, and district People
  “Delegate staff” were aligned to the person actually looking.
- 2026-09-14 — School admin People: sitting administrators are not asked
  to “delegate this school” / invite themselves. Remaining invite-admin
  copy is for district operators only; school staff invites default to
  Coach.
- 2026-09-14 — Account-access Agents 1–15 walked. Closed Over-grant:
  `school_admin` on a club/team via `/admin/users` (`0105` uses
  `invitation_role_fits_organization` on membership writes). District
  coaches no longer get a bouncing Schools shortcut. CSV import names
  allowed roles.
- 2026-09-14 — Account-access workflow agents (15) added: each walks every
  account type for customizability, missing features, and grant-only-certain
  access. Skill `.cursor/skills/account-access-customizability/`. No app code.
- 2026-09-13 — Family RSVP clear no longer errors after resetting a coach
  invite; household-created answers delete instead of becoming phantom invites;
  parent pending-request counts only parent-opened rows; join codes are
  student-only; editing an approved public event stays published (`0104`);
  club coaches no longer see Remove / rotate controls that always fail.
- 2026-09-13 — A claimed school administrator no longer sees a permanent
  “Delegate this school” mission on People; district claim (`0103`) also
  moves still-super-admin-owned child schools to the new district owner so the
  Hand off school CTA can succeed; failed district event summaries hide zero
  totals and empty-roster invite framing.
- 2026-09-13 — Staff signup from a claim link now checks the complete invited
  email before calling Supabase Auth. A forwarded or mistyped address cannot
  create a generic staff account that only fails at the later claim step; the
  invitation role remains the source of organization access.
- 2026-09-13 — Unassigned school coaches and assistants no longer hit a roster redirect loop after claim. Overview and manage show a wait-for-assignment mission; school Staff adds Assign groups; People invite success names the next step; Activity labels administrator grant/revoke and group staff changes with People / Students & groups follow-through. No schema change.
- 2026-09-12 — Founder super-admins can delete a school from `/admin/organizations` (including orphan schools not under a district) with the same `DELETE {slug}` confirm as districts; hyphens and underscores both count. Migration `0101`.
- 2026-09-12 — District administrators now get Schools, scoped Staff,
  delegated peers, district competitions, and aggregate-only student/event
  reporting; school administrators get full roster/staff/group controls;
  coaches operate assigned groups only; assistants are assigned-group
  read-only. `0097`–`0098` enforce owner/self/last-admin protections, scoped
  entrant operations, aggregate bulk invites, and announcement fan-out without
  exposing child-school student IDs. Exact roles appear in claims, Account,
  workspace rows, and organization navigation.
- 2026-09-12 — A provisioned district's first matching administrator claim now
  takes protected ownership from the temporary super-admin owner (`0099`).
  Claim membership and ownership both bind to the authenticated invited email;
  school ownership remains an explicit handoff.
- 2026-09-12 — Inherited child-school access no longer falls into assistant
  coach copy or a denied roster loop. Safe staff reads drive delegation,
  legacy district `admin` roles align with district routes, Account/mobile
  shortcuts retain the district label, and `0100` closes stale school event and
  roster gates.
- 2026-09-12 — District claim links no longer stop at a coach login: a matching signed-in mailbox auto-joins as district/school administrator (`0096` makes a repeat claim a no-op), `/admin/users` name search shows that membership instead of only `coach`, and an empty district overview has the create-school form on the page.
- 2026-09-12 — Public `/support` blocks bot tickets (hidden honeypot, mixed-case token-soup bodies, hCaptcha when configured). `/admin/support` can select all shown reports and close or reopen them without emailing anyone.
- 2026-09-12 — `/admin/users` now has indexed, keyset-paginated filters for a district plus connected schools, exact organization, organization type, full membership role/status, account experience, and platform access (`0095`). Matching rows name the organization context; household links never imply district membership.
- 2026-09-12 — Admin `/organizations` expand panel shows Created by (and Owner when different) plus a paginated name/email member search (`0094` `search_org_members`) so a large school does not dump the whole roster.
- 2026-09-11 — District People no longer defaults to Coach (hollow office after claim): District administrator is the default, school-admin setup keeps School administrator while an invite is pending, role help names office vs competition-only access, district Competitions empty copy drops “invite your roster,” and claim signup name help uses the org name for staff.
- 2026-09-11 — Protected founder accounts on `/admin/users` are no longer fully read-only: account experience (student/parent/coach) can change for founders and for your own row; platform administration stays locked. Migration `0092`.
- 2026-09-11 — After a staff claim link, Account no longer says Coach / Organizer for school/district memberships; `/orgs` shows School administrator / District administrator role labels, drops Start a club for institutional-only staff, and titles Your organizations. Account role stays `coach` under the hood.
- 2026-09-11 — Coach Plan mission no longer says “club” when memberships are school or district; `staffPlanMissionFromTypes` matches `/orgs` chrome.
- 2026-09-10 — `/clubs` leads with a sample workspace, season ledger, and season file; districts keep a matching office window.
- 2026-09-09 — `/districts` closing CTA sits copy + Book on one row so the white card is not an empty lane.
- 2026-09-09 — `/districts` no longer lists Price and support as an unfinished item; privacy, email volume, and independent clubs remain.
- 2026-09-09 — District Activity rows and Reports school/Needs-RSVP cells link into the scoped school workspace, People, settings, or Competitions `?host=` filter so coordinators act without re-hunting. No schema change; fail-closed loads unchanged.
- 2026-09-07 — District overview no longer pins “View aggregate reporting” during school setup; Reports appears only after schools are ready, while provisioning/verification waits offer competitions. Account Organizations sends district rows to Schools (not a dead Roster), and Family/Account/Leave/event invite copy stays school-or-club honest.
- 2026-09-07 — FIRST’s free FRC Events API is recorded as a commercial-use ban (plus required API-page attribution). The Blue Alliance is not a workaround. Hack Club Hackathons remains the live credited JSON directory.
- 2026-09-07 — National Science Bowl event pages link the official DOE regional-competitions page so coaches can find a qualifying bowl and register. Causey still does not list each regional.
- 2026-09-07 — National Science Bowl no longer sits on the STEM Mathematics filter. The adapter tags it Science only; published DOE rows drop leftover math tags (`0088`). Purple Comet stays the mathematics listing.
- 2026-09-06 — Duplicate-email signup now says “An account for that email already exists” with a Sign in button, instead of a hedged error or a fake confirmation email.
- 2026-09-06 — Signing up again with an email that already has an account (including a temp-mail address used yesterday) showed “we sent a confirmation” and sent nothing. Website and phone now send that person to Sign in.
- 2026-09-06 — Clearing Going on the phone tournament screen left Family showing the old answer because Family stays mounted under the event stack and did not hear the write. The event save now updates Family/Plan immediately and refetches.
- 2026-09-06 — Phone Going / Can't go / Clear looked like they refreshed and then did nothing: an older Family/Plan/event GET could overwrite the tap, tapping Going again cleared it, and Clear left the row in the list as if it still needed an RSVP. The latest write wins; Clear removes a family-discovery row; only Clear answer unmarks.
- 2026-09-06 — A parent could not unmark Going / Can't go, and the phone skipped the website handshake (invite → student accepts on Plan → parent confirms organizer registration on Family). Clear answer now deletes family-discovery rows or resets a coach invite. Invite is the primary control for a linked student on a public listing; Going remains for kids who are not on Causey.
- 2026-09-06 — Phone Bring your roster 404ed on causey.dev (the write route is not live there) and showed that error to parents. The card now loads only for roster coaches; if the write path is missing it opens the website event page instead. Event Going copy matches the website: a club/school invite is "An RSVP needs your response" (Family); a public listing still lets a parent mark a linked student Going without an invite.
- 2026-09-06 — Phone Family told a parent "1 upcoming tournament" without naming it. Settled Going / Can't go rows now list the tournament (date, place, status) and open the event, same as the website's Settled upcoming section.
- 2026-09-06 — A coach on the phone could not mark a club, team, or school as going on a public listing. The website aside (Bring your roster) now has a phone card on the same write path. Inviting the roster still opens manage on the website; group/individual invites stay desk work.
- 2026-09-06 — Marked complete had no way out: the only control was "Registration is still needed," which does not mean Can't go and does not say Causey cannot cancel organizer entry. The complete state now offers Can't go (RSVP + drop the complete mark so Plan lets go) and Undo complete mark, and after a decline the page says so with a withdraw link on the organizer site.
- 2026-09-06 — Website audited against the phone's findings. The cross-account cache leak does not exist here (no browser storage, no `unstable_cache`, no `revalidate`, per-request Supabase clients), but the untrusted-URL class does and reaches further: zod `.url()` accepts `javascript:`, and the event page's pathway panel put a scraped `reg_url` straight into a public `href`. One guard now covers every external link and both write paths. Dead ends closed: a 15s fetch deadline for search and pathways, a dropped connection can no longer look like a successful save, "Profile not ready" has a retry and a sign-out, `/family` guards a null profile, and the root and family error boundaries exist. Sign-out is a document replacement so a school computer's back button cannot reach the last account.
- 2026-09-06 — Phone shared-device privacy and dead ends: the offline cache is scoped per account and cleared when the signed-in user changes (a coach's cached roster could render for the next person on the same phone); every screen that waits on `/api/mobile/me` now offers retry or sign out instead of a spinner; a 200 with no listing, a deep link with no id, and a failed attendance read all end somewhere a person can act; organizer links from scraped listings go through one http(s) guard.
- 2026-09-06 — Phone App Store review pack: no invented “You” RSVP, coach screens redirect when unsigned, website-only alerts open Safari, nationals pin disclaimer, privacy/terms/support match in-app signup and deletion, iPhone-only, privacy nutrition types in the manifest.
- 2026-09-06 — Phone tournament Going / Can't go updates from the tap, same as Yes on organizer registration, when the attendance reload is missing
- 2026-09-06 — Report a problem is a labeled footer link on every website page; the header stays Sign in / Account.
- 2026-09-06 — Report a problem left the header; it sits with Support in the footer, Account data, sign-in, the error page, and phone Me trust links.
- 2026-09-06 — Phone tournament details match the website job: show the listing photo and US Chess rating, ask Going / Can't go, and after organizer registration ask whether they finished and confirm they are going. Add to calendar falls back to an .ics / Calendar template in Expo Go.
- 2026-09-06 — Support is a problem-report form (optional screenshot) that emails the founding inbox and lets platform admins reply into Alerts plus email. Not a corner chatbot.
- 2026-09-06 — Phone Search is a simple name + zip (+ distance) form. Website filters (when, featured, club/school going, source, grade, rating, fee, state, dates, type facets) sit behind Advanced search. Sort stays with the listings. The chess nationals pin is still under Search. `/api/competitions` now uses a phone Bearer token so club-going can actually match.
- 2026-09-05 — District walkthrough (P3 PDF): People invitation status filters pending vs revoked with distinct colors; claim links refuse Accept when the signed-in mailbox is not the invited hint; signup can resend confirmation; alerts mark read when opened; `/orgs` splits district/school/club; district announcements default to staff-only and can pick schools plus staff vs students/parents; native password reveal hidden; event difficulty ratings can be cleared.
- 2026-09-05 — Phone `/orgs` lists the signed-in account’s clubs, teams, schools, and districts (`GET /api/mobile/orgs`, same `getMyOrgs` as the website). Coaches with a roster open `/roster/[orgId]`. No create, settings, CSV, or public directory. District offices have `has_roster: false`.
- 2026-09-05 — Phone event screen can show the same “going from your club or school” groups as the website (`get_club_going` via `/api/mobile/club-going` + `ClubGoingCard`). Unsigned stays quiet; empty groups are not an error.
- 2026-09-05 — Phone Search covers all five public directories (not chess-only), with Upcoming/All and honest empty copy per type.
- 2026-09-05 — New passwords on signup, reset, and account change show a strength bar and reject weak strings (8+ mixed case and a number, or a long passphrase). Login is unchanged.
- 2026-09-05 — Parents can mark a linked student Going on a public event without a club/school invite. Family shows that status. Save is a bookmark. Organizer-site RSVPs are still Mark complete (`0080`).
- 2026-09-05 — Parent recommend and coach roster invite no longer trust an empty upsert body. Recommendations write Alerts + show on Plan (`0079` backfill). Invites re-read invited rows, then fan out student and parent Alerts.
- 2026-09-05 — Super admin can provision a child school under an existing district and invite its named administrator (claim link + code). `/admin/organizations` nests School account rows; orphan-school create is removed; People shows the activation code. Migration `0078`.
- 2026-09-05 — Staff team-entry: coaches and school admins can mark an invited student going / not going on Manage event; audited as `response_source = staff`; student + linked parents get in-app alerts; Family and reply meta label staff entry. `0076` now removes the authenticated entrant guard before its owner-run backfill and recreates the updated guard afterward.
- 2026-09-05 — Chess search and the homepage chess rail pin a labeled “Get your kid to chess nationals” placement above the list; click opens `/pathways` on the current seeded chains (not an official US Chess ruling).
- 2026-09-04 — Tournament search: limiter RPC errors no longer 429 as “too often”; search/geo fail open; actor key is always hashed IP plus cookie JWT.
- 2026-09-04 — Host create preview: search card and event-page start (same CompetitionCard / event hero), not a fact dump.
- 2026-09-04 — Host a competition: type tiles with category marks, required discipline/format/genre chips, no silent chess default on draft or publish.
- 2026-09-04 — Platform admin account stats filter the directory: Total accounts → every account, Platform admins → `/admin/users?access=admins` (`0073`).
- 2026-09-03 — P3 remaining: `/billing` shows entitlements, unpublished invoices, and dunning; `/portals` is a local custom-host preview (UUID bind, fail-closed unknown host). Privacy/Terms name Vercel, Supabase, Resend, Sentry, OpenAI, and GitHub Actions; club subscription is not in force. Skip-to-content; nested `<main>` removed; footer legal nav. Still no Stripe SDK, no pairings/dues/DMs, no DPA or VPAT.
- 2026-09-03 — P3: `/billing` Stripe Checkout panel matches the page’s hero card and fact rows (same shell as the left column). Still not connected.
- 2026-09-03 — District school-student chrome: grade help on Account, My tournaments empty copy, search “My school is going,” event “Going from your school” derive nouns from org memberships.
- 2026-09-02 — P3: `/billing` is a local-only Stripe Checkout + billing desk for club/team SaaS. Production/preview 404. `/clubs` no longer says “No billing or Stripe.” Student dues and tournament entry stay off the SKU.
- 2026-09-02 — P2: Competitions lists past travel; attendance opens on start date; district Reports filter by type and show participating-school origin; CSV invites are one RPC; `/districts` names the shared org workspace (chess working surface, other types hostable). Apply `0070` on hosted Supabase.
- 2026-09-02 — Club owner · first session: Start a club (not a fourth account type) → coach signup copy → `/orgs/new` club/team only; empty `/orgs` and nav say clubs; People hides School administrator on club/team.
- 2026-08-31 — District Schools settings (`#schools`): same pilot readiness next actions as the command center (invite/handoff/provision), fail-closed retry — not verification-only labels.
- 2026-08-29 — District-hosted manage replies: label each RSVP/attendance row with the connected school, sort by school, and surface organizer-registration follow-up on going rows.
- 2026-08-27 — Home organizer switch: massive draggable window slider (red/blue halves, mirrored white labels, midpoint live-switch) with a district sheen prompt until first try; board copy/body slides in the thumb's travel direction.
- 2026-08-27 — School-safe roster/manage: progressive group edit, status-grouped replies, group-first invites; Family metadata honesty.
- 2026-08-26 — Event travel control: “Bring your roster,” one organization chooser, and no rosterless district attendance.
- 2026-08-26 — Home organizer: club season as a printed scoresheet, district as a nested blue office panel; drop twin cards and Planned next.
- 2026-08-26 — Home organizer band: one chassis (club season spine + district ledger + planned-next lower deck), not two stamped cards.
- 2026-08-26 — Home hero type picker uses the section graphics (equal-size cropped marks) for Chess, Debate, STEM, Arts, and Writing.
- 2026-08-26 — Directory search heroes restore the type-specific 3D PNGs beside the filled search card (compact overlay on phones).
- 2026-08-26 — Home organizer band: club vs school-district peer cards (subgrid, compact 01–04, district copy names the assisted pilot).
- 2026-08-26 — Platform admin ops stats, organizer event pulse/workspace, parent competition alerts (`0067`).

- 2026-08-26 — Event comments, desktop home featured listings (photos or saved zip), zip/location capture on signup and role landings.
- 2026-08-26 — Desktop hero zip/distance are equal columns; event difficulty 1–10 is two rows of five.
- 2026-08-26 — Homepage Find card: My tournaments tab previews Going / RSVP / org hosted and traveling events; signed-out sign-in returns to that tab.
- 2026-08-26 — Phone discovery: homepage search-first (type rows, optional zip); directory search sits above collapsed filters.
- 2026-08-26 — Home hero fills the remaining viewport (dvh minus header) with a bobbing cue that scrolls to coverage.
- 2026-08-26 — Home organizer band: keep 01–04 only on club roster→results; district ready-now and planned-next are unnumbered.
- 2026-08-26 — Home hero: drop early-build banner and the Find-a-tournament list; club/district sit as chips; search card keeps type icons.
- 2026-08-26 — Page-back controls are outlined chips with a chevron (not ghost “← text”), shared across public leaves and in-app returns.
- 2026-08-26 — `/clubs` scope ledger: one white card on a soft band, subgrid-aligned rows, heavier type and padding so the can-do / not-building pair reads as a contract.
- 2026-08-26 — Public pages get a named back link (`PageBackLink`) so `/clubs`, `/districts`, and account/legal leaves are not a dead end when the header logo is hidden.
- 2026-08-26 — `/clubs` can-do vs not-building cards: matching title+line rows, equal height, district note under the pair.
- 2026-08-24 — Visual language: anti-vibecode density/radius/type/motion; `/clubs` pitch; home/districts/login/signup/search packed; reports stats no longer empty bubbles.
- 2026-08-24 — Club agent pass: season trophy board on overview; mid-season “Season is underway”; team/school copy on reports and history; district-only audience helper hidden for clubs.
- 2026-08-24 — Agents created. First ship: club record-results mission + club/team chrome; district competitions-next + overview calendar.
