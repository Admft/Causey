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

- **Shared visual language:** scholastic competition density — filled panels, rounder controls, heavier type, club `/clubs` peer to `/districts`.

## Last tick

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
