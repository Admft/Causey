# Agent 6 — Notifications and email

## Scope covered
- `.cursor/20k-full-audit-roles.md`, `.cursor/district-readiness.md`, `.cursor/club-readiness.md`, `.cursor/district-ux-progress.md`, `docs/district-pilot-runbook.md`, `SETUP.md` (email/cron notes)
- `lib/notifications.ts`, `lib/actions/in-app-notifications.ts`, `lib/actions/notifications.ts`, `lib/actions/entrants.ts`, `lib/actions/district.ts` (`publishOrganizationAnnouncement`, prefs, CSV invites)
- `lib/email/{config,enqueue,delivery,template}.ts`, `app/api/cron/product-email/route.ts`, `vercel.json`
- `app/me/notifications/page.tsx`, `app/account/page.tsx` (Alerts), `components/{NotificationPreferencesForm,NotificationInboxActions,AnnouncementForm,AuthNav}.tsx`
- `lib/data/district.ts` (`getNotifications`, prefs, attention sources)
- SQL: `0018` (outbox + prefs), `0033` (in-app RPC), `0036` (enqueue RPCs), `0043` (announcement operator RLS), `0044` (stale-lease reclaim), `0067` (household alerts, result email, guardian RPCs)
- Tests: `tests/{notifications,product-email-delivery,email-delivery-behavior,in-app-notification-fanout,parent-competition-alerts,district-announcement-fanout}.test.ts`
- Vercel cron/function limits (Hobby: **once/day**, ±59 min; Pro: once/minute)

## Verdict
**Blocker.** The outbox, Resend, prefs, and guardian routing are a real pilot-scale path (`mail.causey.dev`, `CRON_SECRET`, skip-locked claim). They are **not** ready for ~20k users, monthly-paying clubs, or district announcement fan-out. Hobby’s **one cron per day** (`vercel.json` `0 14 * * *`) plus a **hard 50s drain** in `GET /api/cron/product-email` caps sends at on the order of **hundreds per calendar day**, while default-on email + guardian copies + one district “every connected school” post can enqueue **thousands in a single action**. Paid-club claim mail and tournament invites sit until ~14:00 UTC (± ~1h). Restoring `*/5` on Pro is **required**, not optional — and still insufficient until enqueue is bounded and the worker can empty the outbox (or invitations send immediately). District-readiness still lists **“Email proven at school volume”** as unchecked; treat live throughput as **unknown / fail-closed**.

## Keep
- Service-role `email_outbox` with `claim_email_outbox_batch` (`FOR UPDATE SKIP LOCKED`, 15-minute stale `sending` reclaim, four-attempt cap) — `0036` / `0044`
- Resend send + `idempotencyKey` `causey/{dedupe_key}` and `provider_message_id`
- Kind prefs + `email_enabled` master switch + `prefersEmailKind` / `prefersInAppKind`
- Live “Needs attention” vs stored inbox split (`buildAttentionItems`, `buildLinkedChildAttentionItems`)
- Active-household guardian RPCs (`get_guardian_email_recipients`, `get_active_guardians_for_profiles`) and invitation **exclusion** from `get_pending_notification_emails` (avoids double invite mail; 0067 comment)
- Immediate in-app writes for invite / RSVP / announcement / result / account; claim-link CSV fallback when mail is late
- Auth on the cron route (`timingSafeEqual` + `CRON_SECRET`); Auth SMTP kept separate from product mail

## Findings
1. Cron capacity · Hobby once/day + 50s loop · Paid-club invites and district fan-out cannot meet a same-day SLA; ~14:00 UTC ±59 min is the only automatic send window · **P0 · L** · `vercel.json` `crons[0].schedule`; `app/api/cron/product-email/route.ts` `deadline = Date.now() + 50_000`, `maxDuration = 60`, `deliverPendingEmailOutbox(25)`
2. Enqueue RPCs unbounded · `get_email_reminder_candidates` and `get_pending_notification_emails` return every tracked/unemailed row with no `LIMIT` · At 20k the cron will timeout or OOM **before** claim-mail drains; opted-out rows stay `emailed_at IS NULL` forever · **P0 · L** · `0036_product_email_delivery.sql` `get_email_reminder_candidates`; `0067` `get_pending_notification_emails`; `lib/email/enqueue.ts` `enqueueAttentionEmails` / `enqueueStoredNotificationEmails`
3. Silent backlog · Worker returns `{ ok: true }` with no remaining-outbox count · Ops will think mail is healthy while thousands sit in `pending`/`failed` · **P0 · M** · `GET` in `app/api/cron/product-email/route.ts`
4. Organization claim mail waits on the same worker · `create_org_invitation` inserts `organization_invitation` outbox rows immediately, but send is cron-only; CSV allows 500 invites/import · Paying clubs cannot trust “we emailed them”; runbook workaround is hand-trigger · **P0 · M** · `0018` `create_org_invitation`; `bulkInviteOrganizationMembers`; `docs/district-pilot-runbook.md` §1.7 / §10
5. District/club in-app fan-out is one RPC per recipient · `createInAppNotifications` concurrency 10; announcement also loads members + guardians per school · One “every connected school” post at district scale will timeout the server action and return “published, but N updates could not be created” · **P0 · L** · `lib/actions/in-app-notifications.ts` `FANOUT_CONCURRENCY`; `publishOrganizationAnnouncement` in `lib/actions/district.ts`
6. Guardian copies duplicate parent in-app mail · Stored announcement/result rows are created for parents **and** `addGuardianCopies` re-queues the student’s row to the same parent · District fan-out doubles parent volume and looks like spam · **P1 · M** · `enqueueStoredNotificationEmails` + `addGuardianCopies`; `0067` pending kinds include `announcement`/`result`; parent inserts in `publishOrganizationAnnouncement` / `recordEntrantResult`
7. Students without `auth.users.email` never enter reminder enqueue · Invitation is also omitted from pending email · Under-13 / email-less students: parents get in-app invites but **no** invite/reminder product email · **P0 · M** · `get_email_reminder_candidates` `u.email is not null`; `0067` comment “Do not add invitation here”; `addGuardianCopies` only runs off the student row
8. Inbox is last 20 stored rows, no pager · Nav badge is stored `read_at IS NULL` only, not live attention · District announcement storms bury invites; badge can read 0 while Family still needs a response · **P1 · S** · `getNotifications(..., limit = 20)`; `AuthNav` unread `from("notifications")`; `/me/notifications`
9. Prefs / routing UX lies at 20k · Per-kind checkboxes copy says “In-app” but they also gate email; `guardian_routing` is honored only when `profileRole === "student"` so a parent toggle is a no-op · **P1 · S** · `NotificationPreferencesForm`; `addGuardianCopies`; `prefersEmailKind`
10. No digest · Each attention item is its own outbox row (`attention:{profile}:{item.id}`) plus guardian copies; defaults are all-on · Week-of-events × 20k × parents explodes Resend usage even after Pro · **P1 · M** · `lib/email/enqueue.ts` `dedupe_key`; `DEFAULT_NOTIFICATION_PREFS`
11. Deliverability gaps · No `List-Unsubscribe`, bounce/complaint webhook, or suppression list; plaintext part omits the settings link that HTML has · Shared `Causey <updates@mail.causey.dev>` only — no per-district From · Custom portals and school trust will land in spam / look unofficial · **P1 · M** · `lib/email/delivery.ts` `resend.emails.send`; `lib/email/config.ts` `getProductEmailConfig`; `renderProductEmail`
12. Dead `notification_jobs` table; no operator outbox UI · After 4 attempts (on Hobby that is four **days**) mail is abandoned · Fail-closed for “did families get the cancellation?” · **P2 · S** · `0018` `notification_jobs`; `claim_email_outbox_batch` `attempts < 4`
13. Retry math assumes a frequent worker · Failure `send_after` is minutes (`2^attempts * 5`, cap 60) but Hobby pickup is next calendar day · **P2 · S** · `deliverRow` in `lib/email/delivery.ts`
14. Volume never proven · District backlog: “Email at school volume / ops / not proven”; club backlog: “outbox wired, not club-volume proven” · Resend plan/quota **unknown / fail-closed** · **P0 · M** · `.cursor/district-readiness.md`; `.cursor/club-readiness.md`
15. Product outbox templates are only `organization_invitation` + `notification` · No club-subscription receipts/dunning in this worker (Stripe is Agent 1); no per-competition-type copy (chess/debate/STEM share one template) · Fine for a generic alert, not a paid-SaaS or custom-portal mail program · **P2 · M** · `messageForOutboxRow`

**Hobby vs Pro (direct answer):** **20k + paid clubs REQUIRES Pro (or an external scheduler hitting the same route) and more than one run per day.** Hobby cannot schedule `*/5`; the worker is written for `*/5` then deliberately slowed to daily. Even on Pro, keep `*/5` (or a queue consumer) **and** raise/remove the 50s cap, bound the enqueue RPCs, and send org invitations without waiting for the reminder sweep. A single 50s Hobby run cannot drain a district fan-out or a 500-row CSV plus the day’s reminders.

## Must-build before go-live
1. Leave Hobby cron: Vercel Pro (or equivalent HTTP scheduler) with at least `*/5` (as the 2026-08-08 note already planned) and a worker that reports **remaining outbox** and fails if it cannot drain.
2. Split enqueue vs send: cap `get_email_reminder_candidates` to the actual 1-/7-day window in SQL; cap pending emails; mark opted-out / non-email kinds so they leave the pending set.
3. Transactional org/claim mail must leave the daily batch: send (or a dedicated high-frequency drain) on `create_org_invitation` / reissue / CSV, not only at 14:00 UTC.
4. Replace per-recipient `create_in_app_notification` loops with a set-based fan-out for announcements (and large invite groups).
5. Dedup guardian email against an existing parent in-app row; enqueue parent reminder/invite mail when the student has no email (parent attention path).
6. Inbox pagination (or a real unread query that includes live attention); retention/purge for old `notifications` / `email_outbox`.
7. Deliverability floor: `List-Unsubscribe` + settings link in text; Resend bounce suppression; documented paid Resend quota sized for 20k × default-on × guardian copies × district posts. Per-district From/domain is the custom-portal mail SLA.

## Open questions for the owner
- Paid-club invite SLA: minutes after CSV, or is same-calendar-day acceptable? That decides “send on invite” vs “Pro `*/5` only.”
- Custom district portals: shared `updates@mail.causey.dev` vs per-district authenticated domain (procurement / spam, not just branding).
- Resend product and monthly cap: **unknown in repo**; 20k default-on traffic will exceed typical starter quotas on a busy tournament weekend.
- Whether announcement email should be a digest / staff-only-by-default at district scale to keep fan-out from looking like spam.
