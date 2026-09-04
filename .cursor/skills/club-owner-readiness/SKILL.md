---
name: club-owner-readiness
description: Simulates a professional club or team owner (chess, debate, STEM, arts, writing, or custom) walking every Causey club workflow. Use when auditing club features, deciding what a club still needs, or shipping club/team UX — not school-district hierarchy work.
---

# Club-owner readiness

Work as a **paid club or team owner** who runs practices, travel events, and a season. The club may be chess, debate, STEM, arts, writing, or mixed. Causey must stay useful without becoming SwissSys, Tabroom, or a billing product.

## Always read first

- `.cursor/club-readiness.md` (living backlog)
- `.cursor/club-district-perfection-loop.md`
- `docs/club-feature-overview.md`
- `.cursor/district-ux-progress.md` last club-related tick

## Simulate these jobs (in order)

Walk routes as a first-time coach who created a **club** or **team** (not a school):

1. Create the club → invite students → groups
2. Find public events → mark “club is going” → invite roster → RSVP / organizer registration
3. Host a club event (draft → preview → audience → publish)
4. Day-of: attendance, then **record place/award**
5. Season: reports CSV, student history from roster names, Plan/Family outcomes
6. Ops: announcements, website/meeting note, leave-club, ownership, staff invites

Primary routes: `/orgs/new`, `/orgs`, `/orgs/[slug]`, roster, people, competitions, manage, reports, `/chess` (and other directories), `/me`, `/family`, `/account`.

## What Causey is (keep)

Coordination + discovery: roster, invites, RSVP, attendance, recorded results, family desk, public chess search. Chess is the densest listings; other types are honest and incomplete.

## What Causey is not (do not build)

Pairings, ballots, live standings, student dues, coach–parent DMs, public student profiles, LMS/practice homework, Lichess/Tabroom OAuth, public club directory until owner/legal says so. Club SaaS checkout is a local `/billing` layout only until a processor is connected.

## Ship rule

One end-to-end club-owner win per tick. Prefer a whole job (record results after attendance, season board, travel-event invite) over chrome. Club/team copy must not say school/district. Update `.cursor/club-readiness.md` and `.cursor/district-ux-progress.md`. Branch `dev` only.

## Additional resources

- Workflow checklist: [workflows.md](workflows.md)
- Gap policy: [out-of-scope.md](out-of-scope.md)
