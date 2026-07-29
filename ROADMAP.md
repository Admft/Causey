# Causey feature roadmap

The account/portal foundation (roles, orgs, join codes, groups, hosted
tournaments, RSVP, household links, org attendance on public events) shipped
2026-07-28 in migrations `0009`–`0013`. This is the build list on top of it.

## Shipped 2026-07-28 (migration 0014)

- [x] **Share / recommend events** — send any event to a connected account
  (parent ↔ child, org-mates, coach ↔ roster) with an optional note;
  recipients see "Recommended to you" on their portal page and can dismiss.
- [x] **Password reset** — /forgot-password (email link) and /reset-password.
- [x] **Community difficulty score** — event pages show the average 1–10
  student rating and count, not just your own.
- [x] **"Going from your club"** — signed-in members see which teammates
  have RSVP'd going on an event page (display names only, same-org only).
- [x] **Edit / cancel hosted tournaments** — coaches fix details after
  publishing; cancelling archives the event for everyone.
- [x] **Add to calendar** — .ics download on every event page.
- [x] **My schedule** — /me lists the events you're going to.

## Next up (designed, not started)

- [ ] **Org settings** — rename an org, change type/state, transfer ownership.
- [ ] **Multi-section tournaments** — coaches add rating/grade-limited
  sections at create time and edit them later (schema already supports it).
- [ ] **Assistant coaches** — invite a second adult into an org as
  coach/admin (org_memberships.role supports it; needs an invite path since
  join codes always grant `student`).
- [ ] **Coach announcements** — short org-wide notes shown on the org page
  ("Bring your own boards Saturday").
- [ ] **Email notifications** — invite received, RSVP received, link request,
  recommendation received (Supabase auth SMTP or Resend).
- [ ] **Results & history** — record placements per entrant after an event;
  student profile shows tournament history; feeds the pathway graph.
- [ ] **Student ratings on profile** — optional US Chess ID / rating field,
  used to pre-filter eligible sections.
- [ ] **School directory** — public, opt-in listing of orgs by state so
  students can find a club near them ("browse schools on Causey").
- [ ] **Search "my school is going"** — filter /chess by events your orgs
  attend.

## Later / needs design

- [ ] **Moderation queue** — coach-created *public* events go through review
  before listing (status `pending_review`); private events stay instant.
- [ ] **In-app registration & payments** for org events (fees, Stripe).
- [ ] **Attendance history / season view** for coaches (who came to what).
- [ ] **Achievements** — badges for first tournament, 5 RSVPs, etc.
- [ ] **Messaging** — real coach ↔ parent threads (big safety surface; needs
  moderation design before building).
- [ ] **District rollups** — district-type orgs aggregating member schools.

## Deliberately not planned

- Student ↔ student friend graph (orgs + groups cover the social layer with
  less moderation risk for minors).
- Scraped-event registration on Causey (external `reg_url` stays canonical).
