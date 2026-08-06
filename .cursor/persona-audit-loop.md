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
- 2026-08-06 — Shipped role workspace differentiation: parent desk (`/family` action inbox + student rail), student plan (`/me` + homePath/nav “My tournaments”), coach mission (`/orgs`), shared `PortalMission`/`PortalListRow`, filter-rail soft-scroll inset.

## Backlog candidates (from 2026-08-06 audit)

### P0 / first-session killers
- `/family` `/me` `/orgs` share one recipe — **done 2026-08-06**
- Student post-auth lands on empty `/orgs` — **done 2026-08-06**
- Student nav hides schedule under Account — **done 2026-08-06**
- Event page: no clear next-action tree (register vs invite vs save)
- Join link forces Sign in before Create account
- Parent desk only counts RSVPs; organizer registration lives on `/me`

### P1 / trust & IA
- Home: unfinished type cards compete with Chess
- HomeAccountPitch: coach-weighted conversion on discovery home
- `/chess` overclaims (“every tournament”)
- Mobile: banner + header + subnav eat discovery/portal viewport
- Coach org home still reads as panel soup / directory
- Manage tournament orphaned from org subnav
- Admin home not moderation-first
- District admin has no distinct landing (schema-dependent for full fix)

### Later / schema-gated
- Real district shell + audience scopes + aggregate reporting
- Role split coach vs org admin vs district admin
- Bulk provisioning guided flow
