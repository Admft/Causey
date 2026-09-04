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

## District and organization foundation shipped

- [x] **District → school hierarchy** — platform-provisioned districts,
  connected school workspaces, guided school-admin delegation, ownership
  handoff, and pilot-readiness command center.
- [x] **Bulk provisioning** — expiring staff claim links, CSV import/export,
  invite status, and reissue without shared passwords.
- [x] **Organization verification and moderation** — platform queues,
  correction notes, public-event review, and district-grouped school
  verification.
- [x] **Audience-scoped tournaments** — public, district-only, school-only,
  and invite-only access enforced by RLS.
- [x] **District reporting** — aggregate participation, RSVP, going, and
  attendance counts by school without exposing browsing data.
- [x] **In-app alerts** — invitation, RSVP, announcement, account, and tracked
  tournament change updates plus visit-time deadline reminders.

## Next up

- [x] **Org settings** — rename an org, change state, and transfer ownership
  (organization type is intentionally immutable).
- [x] **Multi-section tournaments** — coaches add rating/grade-limited
  sections at create time and edit them later (schema already supports it).
- [x] **Assistant coaches** — invite staff with scoped organization roles and
  expiring claim links.
- [x] **Coach announcements** — short org-wide notes shown on the org page
  ("Bring your own boards Saturday").
- [ ] **Product email notifications** — product invites and reminders; Auth
  confirmation/reset email remains Supabase SMTP. In-app alerts work today.
- [ ] **Results & history** — record placements per entrant after an event;
  student profile shows tournament history; feeds the pathway graph.
- [ ] **Student ratings on profile** — optional US Chess ID / rating field,
  used to pre-filter eligible sections.
- [ ] **School directory** — public, opt-in listing of orgs by state so
  students can find a club near them ("browse schools on Causey").
- [ ] **Search "my school is going"** — filter /chess by events your orgs
  attend.

## Later / needs design

- [x] **Moderation queue** — coach-created *public* events go through review
  before listing (status `pending_review`); private events stay instant.
- [ ] **Club/team monthly SaaS** — Stripe Checkout, invoices, dunning, and entitlements (local layout at `/billing`; not connected). Student dues and in-app tournament fees stay out.
- [ ] **Custom district portals** — vanity host and UUID feature allowlist (local layout at `/portals`; not connected). January pilots stay on the shared `/orgs` workspace.
- [x] **Attendance history / season view** for coaches (who came to what).
- [ ] **Achievements** — badges for first tournament, 5 RSVPs, etc.
- [ ] **Messaging** — real coach ↔ parent threads (big safety surface; needs
  moderation design before building).
- [x] **District rollups** — district workspaces aggregate connected schools.
- [ ] **Production rollout gates** — account export/delete, student-data legal
  agreements, observability, product email delivery, and live RLS automation.

## Deliberately not planned

- Student ↔ student friend graph (orgs + groups cover the social layer with
  less moderation risk for minors).
- Scraped-event registration on Causey (external `reg_url` stays canonical).
