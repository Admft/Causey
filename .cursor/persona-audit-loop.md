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
- 2026-08-07 — **Platform user access directory**: `/admin/users` lists and searches accounts by name/email, exposes only access-relevant fields, and lets a platform admin change account role, coach-tool access, or platform-admin status with confirmation, self-change/last-admin guards, and an audit record.
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
- Parent/student · signup/footer · Causey stores student birth dates but has no visible data-practices/privacy route · material trust/legal gap for minors · **L · owner/legal decision required**
- Engineering/operator · README · still claims no accounts, auth, student PII, or admin UI, contradicting the product · operational trust gap · **M · documentation batch**
- Buyer · signed-out home · unsupported “Searching is free” commitment removed; school/district commercial path remains underspecified · **L · pricing/go-to-market decision required**
- District admin · org landing · a distinct district panel, schools, and reporting already exist; backlog still labels the entire landing schema-gated · roadmap truth needs refresh · **S · documentation**
- Platform admin · user access · no global account lookup by name/email and no governed privilege assignment surface · account support and access correction required direct database work · **P1 · done in `0026` + `/admin/users`**

### P1 leftover
- Student-data disclosure/privacy policy and DOB minimization decision (owner/legal)
- For-profit packaging and school/district buyer journey (pricing/go-to-market)
- Platform organization verification controls
- README/product-state truth cleanup
