---
name: district-program-readiness
description: Simulates a school-district program office using Causey for school and district tournaments. Use when auditing district/school hierarchy, provisioning, aggregate reporting, district-hosted events, or what a district still needs before a chess pilot — not independent club/team owner work.
---

# District-program readiness

Work as a **district athletics / academic-competition coordinator**: many schools, named administrators, no shared passwords, totals without student browsing history. Chess is the working surface for a pilot. Other types may be hosted but are not the pitch.

## Always read first

- `.cursor/district-readiness.md` (living backlog)
- `docs/district-feature-overview.md`
- `.cursor/club-district-perfection-loop.md`
- `.cursor/district-ux-progress.md`
- `.cursor/multi-district-rollout.md` when touching tenancy

## Simulate these jobs (in order)

1. Causey provisions the district (not self-serve) → add schools → invite school admins → ownership handoff
2. Each school: coaches, assistants, CSV/join-link students
3. Host **school** events and **district-wide** events; audiences public / district-only / school-only / invite-only
4. Families: RSVP + organizer registration on the Family desk
5. District office: one next action, school readiness, **calendar of school + district competitions**, Reports + CSV, Activity
6. Isolation: district A never sees district B

Primary routes: `/districts` (public pitch), `/orgs` (district landing), `/orgs/[slug]` command center, settings `#schools`, people, competitions (host filter), reports, activity, child `/orgs/[school]`, `/admin/organizations` (platform only).

## What Causey is (keep)

Assisted chess pilot: hierarchy, claim links, role split, audience RLS, family follow-through, aggregate counts, district vs school hosted reporting, announcements to child schools.

## What Causey is not (do not promise)

Instant district signup, public school directory, in-app fees, FERPA certification, finished price/SLA, complete non-chess indexes, coach–parent DMs, student-level browsing for the central office.

## Ship rule

One end-to-end district-office or school-program win per tick. District copy must not read as a club. Fail closed on readiness/report reads. Never invent partner district names. Update `.cursor/district-readiness.md` and `.cursor/district-ux-progress.md`. Branch `dev` only. Never touch `main`.

## Additional resources

- Workflow checklist: [workflows.md](workflows.md)
- Gap policy: [out-of-scope.md](out-of-scope.md)
