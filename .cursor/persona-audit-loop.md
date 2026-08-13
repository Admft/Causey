# Persona audit → big-batch loop

Continuous improvement loop. Stop when the user says stop, or when three consecutive ticks find no P0/P1 gaps that would change a first-session decision.

## Hard rules
- Branch `dev` only. Never checkout/merge/push `main`.
- Commit as Adam only — no Co-authored-by. Push `origin/dev`.
- Design system + anti-vibecode. No fake polish badges. No fabricated data.
- **Batches, not nits.** Each tick ships one *surface-level* win (a whole role landing, a whole flow, a shared portal shell) — never a single scrollbar, spacing, or copy tweak unless it is part of a larger redesign already underway.
- Update `.cursor/district-ux-progress.md` and this file’s **Active batch** / **Last tick** every run.
- Before coding: re-audit personas → refresh Backlog candidates → lock Active batch → then ship the whole batch.

## Personas (emulate each every tick)

Walk the product as a **first-time** visitor in each role. Note friction, dead ends, jargon, missing next action, visual sameness, and trust breaks.

| Persona | First job | Primary routes |
|---|---|---|
| Signed-out visitor | Understand Causey + find a chess tournament | `/`, `/chess`, event detail, signup entry |
| Student | Discover → track/RSVP → see my orgs | `/chess`, `/me`, `/join/[code]`, event |
| Parent | See which child needs what action | `/family`, linked child events |
| Coach | Next tournament / invite / roster task | `/orgs`, `/orgs/[slug]`, create, manage |
| Org admin | Staff, settings, exports (+ coach tasks) | org settings, people, roster |
| District admin | Schools, provisioning, aggregate view | (gap if missing — log as P0) |
| Platform admin | Moderate without hunting context | `/admin/*` |

## Tick protocol

### 1. Audit (mandatory — do this before coding)
- Read progress + this file’s Active batch.
- Spot-check live UI (dev server) and/or source for each persona’s primary routes.
- Write **5–12 concrete findings** into **Backlog candidates** below (persona · surface · what’s wrong · why it hurts · size: S/M/L).
- Prefer findings that would make a first-time user bounce or get stuck.

### 2. Batch (mandatory — do not code yet)
- Group findings into **one Active batch**: 1 theme, 1–3 related surfaces, clearly bigger than a chrome tweak.
- Reject batches that are only “nudge padding / rename one label / fix one scrollbar.”
- State success criteria in one sentence.

### 3. Ship
- Implement the whole Active batch end-to-end.
- `git pull origin/dev`, run relevant tests, commit, push `origin/dev`.
- Mark batch done in progress; clear Active batch; note leftover findings.

### 4. Pace
- After shipping, sleep ~20–25 minutes, then re-audit.
- If blocked on schema (hierarchy, role split), prefer the next visual/portal batch that unblocks trust without inventing fake district features — or implement the real schema work if that *is* the highest-impact open item.

## Active batch
_(none — ready for next audit tick)_

## Last tick
- 2026-08-13 — **Audience-chooser honesty**: District-only appears only for district hosts and connected schools; create/edit/admin paths clamp and reject unsupported district audience; migration `0053` enforces the hierarchy at insert/update; club/team labels stop saying “School only.”
- 2026-08-08 — **Product email live path**: verified `mail.causey.dev` with Resend; protected Vercel worker claims the service-role outbox with idempotent retries; invitations, reminders, stored updates, and active-guardian copies respect email and per-kind preferences (`0036`).
- 2026-08-08 — **District-readiness audit batch**: public district pilot + trust pages, fail-closed join links, separate-device student signup handoff, assistant/coach/admin capability boundaries, district-first navigation and multi-school command center, aggregate CSV export, and next-action empty states.
- 2026-08-08 — **TCA publish honesty**: Admin tournament list counts published vs draft, highlights Published badges, and points chess search at Timing: All so accepted TCA rows are not mistaken for failed publishes. Incomplete Unknown/00000 drafts stay out of search on purpose.
- 2026-08-08 — **Claim-link ops without email**: People can reissue and copy fresh claim links for pending invites, CSV imports return copy/download claim lists, and login uses the invitation preview so staff vs student signup CTAs stay correct while email delivery remains offline.
- 2026-08-07 — **Staff invitation onboarding**: migrations `0029`–`0030` add a privacy-minimized invitation preview, invalid/expired claims fail closed, staff signup avoids DOB, and organization membership—not a destructive global-role rewrite—drives staff navigation and tournament authority while preserving Family/Student access.
- 2026-08-07 — **Effective organization authority follow-up**: migration `0028` makes `owner_profile_id` authoritative after transfer, removes creator delete/private-event powers, and gives district admins database-backed child-school controls. Event auth keeps context, public publication confirms, and user-directory outages no longer masquerade as missing migrations.
- 2026-08-07 — **Platform organization verification workflow**: migration `0027` prevents organization self-verification, district-created schools start pending, `/admin/organizations` provides a review queue with private correction notes, and organization Settings shows the decision and next step.
- 2026-08-07 — **Platform user access directory**: `/admin/users` lists and privately searches accounts by name/email, exposes only access-relevant fields, and lets a platform admin change account role or platform-admin status with confirmation, self-change/last-admin guards, serialized revocation, and an audit record.
- 2026-08-07 — **District-safe organization lifecycle**: coaches cannot create districts; district join codes/student invitations are blocked in UI, actions, and migration `0025`; district roster paths removed; school creation hands off to administrator delegation; org type is locked.
- 2026-08-07 — **Honest alerts center**: real in-app records lead; empty state names the role workspace; automated/email delivery is explicitly not operating; preferences are framed as future choices; nav says “Alerts & settings.”
- 2026-08-07 — **Org admin people mission**: `/people` leads with join-link vs email-invite guidance; CSV demoted; claim-path success is copyable (not a raw dump); empty state no longer says “invite staff first.”
- 2026-08-07 — **Coach empty-org join before create**: overview + `/orgs` lead with invite-students when roster has no students; create demoted; coach meta shows student count (not coach-as-member).
- 2026-08-06 — **School-safe tournament manage**: `/event/[slug]/manage` leads with invite/reply/attendance mission; invite-first when empty; hairline reply rows; `#rsvps` fixed; OrgSubnav no longer fakes Overview on manage/edit.
- 2026-08-06 — **Student/parent activation** + roster school-safe + portal sticky CTA.

## Backlog candidates (tick 15 follow-up)
### Tick 15 audit
- All signed-in roles · alerts center + nav · automation status, real records, role-aware empty action, and future preferences are now explicit · **done**
- District lifecycle · coach-created districts and district-level students · role/type leaks bypass hierarchy · **P0 · done in `0025` + app guardrails**
- District admin · school creation · previously landed on student roster mission instead of delegation · **P1 · done**
- District admin · nav · district exposed coach-style roster/groups · **P1 · done**
- Operator · org type · freely mutable after creation despite access/hierarchy impact · **P1 · done**
- Parent/student · signup/footer · public privacy/terms and student-data disclosure now linked; district agreement still requires owner/legal approval · **done / legal review remains**
- Engineering/operator · README · product state now matches accounts, student data, assisted districts, and platform admin · **done**
- Buyer · signed-out home · district pilot path and founding-team CTA now exist; commercial packaging still requires an owner decision · **partially done**
- District admin · org landing · a distinct district panel, schools, and reporting already exist; backlog still labels the entire landing schema-gated · roadmap truth needs refresh · **S · documentation**
- Platform admin · user access · no global account lookup by name/email and no governed privilege assignment surface · account support and access correction required direct database work · **P1 · done in `0026` + `/admin/users`**

### P1 leftover
- Student-data disclosure/privacy policy and DOB minimization decision (owner/legal)
- For-profit packaging and school/district buyer journey (pricing/go-to-market)
- README/product-state truth cleanup
- District-readable admin activity log (needs scoped RPC — do not open raw `audit_events`)
- Apply pending migrations through `0053` in each environment

### Tick 16 audit
- Platform admin · organizations · verification status exists but `/admin/organizations` neither shows nor changes it · operators cannot complete the trust workflow that moderation already references · **P1 · done**
- Security / org admin · organization updates · broad org-admin UPDATE policy allows direct `verification_status` changes because no column guard reserves them for platform admins · an organization can self-verify outside the UI · **P0 · done in `0027`**
- District admin · school creation · `createDistrictSchool` writes `verification_status: "verified"` before platform review · child schools bypass the intended trust gate · **P0 · done**
- Org admin · Settings · the organization’s own verification decision and rejection reason are absent · administrators cannot tell what is blocked or what to correct · **P1 · done**
- Platform admin · user directory · migration `0026` remains unapplied, so the shipped account search surface will show a schema-gap error in environments missing migrations · **P1 · deployment**
- Coach/org owner · ownership transfer · creator-derived authority remains effective after owner transfer, including delete and private tournament access · **P0 · done in `0028`**
- District admin · child school · SQL grants parent-district administration but portal UI checks only direct school roles · additional district admins lose People, Reports, and Settings · **P1 · done in `0028`**
- Invited staff · claim/signup · school and district administrator invitations default to Student signup and DOB collection · wrong persona and unnecessary minor-data field block staff onboarding · **P1 · done in `0029` + 2026-08-08 claim-link ops**
- Org staff · tournament actions · create/manage gates disagree across global account role, org role, and event creator · valid staff can reach actions that reject them · **P1 · partially fixed in `0028`; creation persona remains**
- Signed-out student · join link · failed organization preview still presents a believable invitation and signup CTA, then rejects the code after account creation · **P1 · M**
- Signed-out visitor · event save/rate · login omitted the event return path and sent the user to a role landing · tournament context was lost · **P1 · done**
- Parent · first child setup · parent is told to create a separate student account while already signed in, creating session and credential-ownership ambiguity · **P1 · L**
- Platform admin · user search errors · every RPC failure was labeled “migration 0026 missing,” hiding connection and permission incidents · **P1 · done**
- Platform admin · organization-role handoff · user directory points to organization workspaces, but platform-admin status alone does not open scoped People/Settings controls · **P1 · M**
- Platform admin · moderation · approval published a public family-facing listing with one click and no confirmation · **P1 · done**
- Parent/student · signup/footer · student DOB is collected without a visible data-practices/privacy route · material minor-data trust gap · **P1 · L · owner/legal decision**
- Buyer · signed-out path · school/district commercial packaging and buyer handoff remain unspecified · for-profit intent has no actionable institutional route yet · **P1 · L · owner decision**
- Engineering/operator · README · documented product state still contradicts accounts, PII, districts, and platform administration · setup and trust decisions can be made from stale assumptions · **P1 · M**

### Tick 17 audit
- Invited coach/admin · `/claim` → signup · claim links do not expose trusted organization/role context before auth and generic signup defaults to Student · staff are asked for student DOB and may abandon · **P1 · done in `0029`**
- Existing student/parent account · staff claim · membership role is granted but global account persona is unchanged · `/orgs` keeps the student surface after accepting administrator access · **P1 · done in `0029`–`0030` with membership-driven workspace**
- Invited staff · invalid/expired claim · claim page presents auth actions before validating invitation state · people can create an account for a dead invitation · **P1 · done in `0029`**
- Signed-out student · `/join/[code]` · organization-preview failures still look like valid generic invitations · student account creation can end at an invalid code · **P1 · M**
- Org staff · tournament create · valid organization staff can manage records after `0028`, but creation still requires the global coach persona/kill switch · role gates remain partly inconsistent · **P1 · done in `0030`**
- Parent · first child setup · creating a separate student account while already signed in remains an ambiguous session/credential handoff · **P1 · L**
- Platform admin · organization roles · global admins can find users but still lack an explicit scoped organization-role assignment path · support handoff remains incomplete · **P1 · M**
- Parent/student · account trust · DOB collection still has no visible privacy/data-practices route · **P1 · L · owner/legal decision**
- Operator · deployment · migrations `0025`–`0028` remain unapplied in environments that have not run the pending SQL · shipped district/admin workflows can report schema gaps · **P1 · deployment**
