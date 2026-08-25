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

- **Club:** After-event results mission — if attendance is marked and place/award is blank, club/school overview leads with “Record a result.”
- **District:** After setup, the office’s next action is the competitions calendar (district + school hosts), not an empty report.

## Last tick

- 2026-08-24 — Agents created. First ship: club record-results mission + district competitions-next + overview calendar.
