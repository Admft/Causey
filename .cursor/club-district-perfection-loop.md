# Club + district perfection loop

Two specialist agents share one loop. Stop when the user says stop, or when three consecutive ticks find no P0/P1 gap that would change a first-session club-owner or district-office decision.

## Agents

| Agent | Skill | Backlog | Catalog |
| --- | --- | --- | --- |
| Club owner | `.cursor/skills/club-owner-readiness/` | `.cursor/club-readiness.md` | `docs/club-feature-overview.md` |
| District program | `.cursor/skills/district-program-readiness/` | `.cursor/district-readiness.md` | `docs/district-feature-overview.md` |

Emulate **that buyer** before coding. Do not mix club IA into district chrome or district hierarchy into a club.

## Hard rules

- Branch `dev` only. Never checkout/merge/push `main`.
- One focused, shippable workflow win per tick (whole job, not a label).
- Design system + anti-vibecode. No fake polish. No fabricated listings or partner names.
- Prefer reuse. Do not invent scrape paths.
- Update this file’s **Active batch**, the matching readiness backlog, and `.cursor/district-ux-progress.md`.

## Tick protocol

1. **Pick a persona** (club owner *or* district program). Read that skill + backlog + catalog.
2. **Walk the skill’s workflow checklist** against routes/source (and live UI when a server is up).
3. Write **5–12 findings** into that persona’s backlog (surface · gap · why it hurts · size).
4. Lock **one Active batch** below. Reject chrome-only batches.
5. Ship the batch. Run relevant tests. Do not commit unless the user asked.
6. Refresh the catalog table if a feature moved Ready / Partial / Missing / Out.

## Active batch

- Phone Search: simple name/zip + Advanced search disclosure — 2026-09-06

## Last tick

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
