# Agent 10 — Ops, legal, accessibility, support

## Scope covered

- `.cursor/20k-full-audit-roles.md`, `.cursor/district-ux-progress.md` (Hobby cron, 0063/Sentry notes)
- `SETUP.md`, `vercel.json`, `.env.example`, `ROADMAP.md`, `docs/district-pilot-runbook.md` §§8–11, `docs/CAUSEY-BUILD-READINESS-AND-FUTURE-TIMELINE-2026-08-08.md` §§5.18–5.20, 9–11.6, 10.1–10.10
- `app/privacy/page.tsx`, `app/terms/page.tsx` (also live at `https://app.causey.dev/privacy`), `app/account/page.tsx` “Your data”, `app/districts/page.tsx`, `app/clubs/page.tsx`, `app/layout.tsx`, `app/error.tsx`
- `components/AccountDataControls.tsx`, `lib/actions/account-data.ts`, `app/api/account/export/route.ts`, `supabase/migrations/0063_delete_own_account.sql`, `0058_platform_super_admins.sql` (`delete_platform_user`), `0017_tournament_drafts_and_covers.sql`, `0062_rate_limits.sql`, `lib/rate-limit.ts`
- `lib/observability.ts`, `tests/observability.test.ts`, `tests/account-self-service.test.ts`, `app/api/cron/product-email/route.ts` (`maxDuration = 60`, `reportError`), `app/api/competitions/route.ts`
- `next.config.ts` (CSP/HSTS), `.github/workflows/ci.yml`, `.github/workflows/ingest.yml`, `proxy.ts`
- A11y surfaces: `app/globals.css` reduced-motion, `components/SiteHeader.tsx`, `components/AuthNav.tsx`, `components/EarlyBuildBanner.tsx` (unmounted), `tests/ui-audit-followups.test.ts`
- Support: `lib/founding-team.ts`, `app/admin/users/page.tsx`, `components/AdminUserDeleteForm.tsx`
- Live Vercel: `.vercel/project.json` → project `causey` / `prj_DE7KkN0H4N5fa1vW0nF2pTob3Lkc`, `get_project`, `list_deployments`, `get_project_deployment_protection`; Vercel Hobby / Fair Use / cron docs

## Verdict

**Blocker** — this slice is not ready for ~20k mixed users, paid club SaaS, or contracted district portals. The product has a real Vercel project and public hostname, honest legal pages, self-serve account export/delete, CI, and a written backup/restore drill. It does not have a commercial hosting plan, proven monitoring/alerting, a completed restore, counsel-approved paid/district terms, an accessibility program, or a support/incident system that would survive school-volume load. Hobby-shaped cron and fair-use limits cannot carry paid clubs; district buyers cannot be promised FERPA certification from this repo.

## Keep

- Honest `/privacy` and `/terms`: unfinished product, no FERPA/COPPA/state-privacy claim, district agreement required, owner/super-admin delete caveats (`app/privacy/page.tsx`, `app/terms/page.tsx`; live on `app.causey.dev`).
- Self-serve Settings → Your data: JSON download + email-confirm delete (`AccountDataControls`, `GET /api/account/export`, `deleteOwnAccount` → `delete_own_account()` in `0063`).
- Owner and founder-admin delete guards (`owns_organization`, `cannot_delete_super_admin`); super-admin delete path at `/admin/users` (`delete_platform_user` in `0058`).
- Production hostname `app.causey.dev`; preview SSO on `*.vercel.app` (`ssoProtection.deploymentType = all_except_custom_domains`); security headers + CSP including `https://*.ingest.sentry.io` (`next.config.ts`).
- CI (`ci.yml`: `audit:prod`, migration filenames, purge dry-run, typecheck, test, lint, mock production build) and twice-weekly ingest workflow.
- Runbook ops notes: Hobby daily cron, manual `/api/cron/product-email`, restore drill, live RLS smoke vs unit tests, Sentry DSN optional (`docs/district-pilot-runbook.md` §§9–11).
- Accessibility building blocks: `lang="en"`, header/nav/main/footer, `prefers-reduced-motion` in `globals.css` and several clients, native labels, `role="alert"` on destructive errors, reports `<caption>`/`scope` (tested in `tests/ui-audit-followups.test.ts`).
- Error page digest as a support handle (`app/error.tsx`); districts pitch lists unfinished price/support/privacy/email (`app/districts/page.tsx`).

## Findings

1. **Vercel Hobby / commercial ToS** · Paid clubs + district contracts on a Hobby-shaped deploy · Hobby is non-commercial personal use only; fair-use caps (~100 GB transfer, ~1M function invocations, ~4 CPU-hrs) and **one cron/day ± ~1h** cannot carry 20k SSR users or school invite bursts; Hobby has no email support, log drains, or team RBAC · **P0 · S** (plan upgrade) / **L** if traffic already near pause · Evidence: `vercel.json` `0 14 * * *`; `.env.example` “Hobby allows one run/day”; `.cursor/district-ux-progress.md` “Hobby-safe product-email cron… Restore `*/5` after Pro”; Vercel Hobby + Fair Use docs; billing **plan unknown** from `get_project` (fail-closed: repo is written for Hobby).

2. **Production drift vs `dev`** · `app.causey.dev` is not current `dev` · Latest **production** deploy is a **promote** of `dev` SHA `dd33951` (`dpl_4T55zzY7…`); newer `dev` SHAs including `1092638` are preview-only (`target: null`). Go-live is not “green `main`” as the runbook states. `get_project.live === false` is unexplained · **P0 · M** · Evidence: Vercel `list_deployments`; runbook §10 “Production must be a green deploy. A failed `main` promotion is not a launch”; `SETUP.md` §7 still “What still needs to happen: Deploy… Point `app.causey.dev`”.

3. **Sentry is optional, homemade, and almost unused** · Cannot detect a 20k outage before a district reports it · No `@sentry/nextjs`; `reportError` POSTs a minimal envelope and is called from **two** routes (`GET /api/competitions`, `GET /api/cron/product-email`). `app/error.tsx` does not report. No `instrumentation.ts` / `global-error.tsx`. Empty `SENTRY_DSN` is a silent no-op. Whether production DSN is set: **unknown / fail-closed** · **P0 · M** · Evidence: `lib/observability.ts`, `tests/observability.test.ts`, grep of `reportError`, `.env.example` “Leave empty”, runbook “Set optional `SENTRY_DSN`… After a test 500, confirm the event arrives”.

4. **Backups / restore unproven** · Student data with no RPO/RTO or logged drill · Runbook §9 is a checklist (“take a backup… restore into a throwaway project… record privately”). No repo evidence the drill ran, no PITR confirmation, no secret-rotation or backup-erasure procedure for DSAR. `SETUP.md` only says take a backup before seed/purge. BUILD-READINESS 10.7 still a release blocker · **P0 · M** · Evidence: `docs/district-pilot-runbook.md` §9; `SETUP.md` “Production retention purge”; `docs/CAUSEY-BUILD-READINESS-…` §10.7.

5. **Legal program cannot sell SaaS or seat a district** · Counsel-approved paid terms, DPA, subprocessors, retention, breach, under-13 · Public pages correctly **do not** claim FERPA. They also do not name Vercel, Supabase, Resend, Sentry, OpenAI, or GitHub Actions; terms have no subscription, refund, SLA, or custom-portal language. `/clubs` still says “No billing or Stripe.” Contact is `causey.dev`, not a privacy inbox · **P0 · L** · Evidence: `app/privacy/page.tsx` “does not claim FERPA, COPPA, or state student-privacy compliance”; `app/terms/page.tsx` “Public pages do not create a district contract”; `app/clubs/page.tsx` notIncluded billing; BUILD-READINESS §§5.18, 10.1, 10.10, 11.6.

6. **Account export is not a complete DSAR** · 20k parents/districts will request “everything” · Export is session GET JSON: profile (including **DOB**), orgs, saved, RSVPs, prefs, 200 notifications, family display names only. No attendance, comments, groups, invitations, results, audit, or org-hosted records. **No rate-limit bucket** (`0062` / `lib/rate-limit.ts` allowlist is search/signup/join/claim/csv/comment/geo) · **P1 · M** · Evidence: `app/api/account/export/route.ts`; `lib/rate-limit.ts` `RateLimitBucket`.

7. **Account delete is incomplete and can destroy org/audit data** · Paid club coach leaves; district DSAR; reviewer accounts · `0063` blocks owners, super-admins, and anyone in `organization_verification_reviews`, then `delete from admin_audit_log` and `delete from auth.users`. `tournament_drafts.created_by` is **ON DELETE CASCADE** (`0017`) — a non-owner coach delete wipes org drafts. Super-admin `delete_platform_user` **reassigns** reviews/audit instead of blocking. No org/tenant offboarding, no district-directed deletion, no backup-deletion rule. Blocked users are told to “Contact Causey” with no ticket path · **P1 · M** · Evidence: `0063_delete_own_account.sql`; `0017` `on delete cascade`; `0058` reassignment block; `lib/actions/account-data.ts` `account_has_review_history`.

8. **Support cannot absorb 20k or paid entitlements** · Founder calendar + marketing site · Intake is `FOUNDING_TEAM_MEETING_URL` (Google Calendar) and `https://causey.dev`. No `/help`, no status page, no severity/SLA/hours/KB. Platform support is `/admin/users` repairs. Hobby has **no Vercel email support**. SETUP §8 still “Assign owners for… pilot support, and incident escalation” · **P0 · L** · Evidence: `lib/founding-team.ts`; privacy/terms contact; `app/admin/users/page.tsx`; Vercel Hobby “Email support: -”; `SETUP.md` §8.

9. **Incident / on-call missing** · Paid + two concurrent districts · No incident/breach runbook beyond restore + RLS smoke; no user-visible status; no named on-call; no alert routing from Sentry/cron/email-outbox/scrape health. `app/error.tsx` asks users to share a digest with “the person who manages your Causey access” · **P0 · M** · Evidence: BUILD-READINESS §§10.6, 11.6, 17 items 5–8; runbook §§9–11; `app/error.tsx`.

10. **Accessibility not procurement-ready** · District IT/504 and 20k mixed devices · No WCAG 2.2 AA audit, no axe/pa11y in CI, no VPAT/statement page, no skip-to-content. Root layout wraps all pages in `<main>` and several routes nest another `<main>` (`account`, reports, claim, notifications). `EarlyBuildBanner` is **never imported**. Footer legal links are not in a `<nav>`. Mobile “More” is a raw `<details>`/`<summary>` with no `aria-expanded` · **P1 · L** · Evidence: `app/layout.tsx`; nested mains grep; `components/EarlyBuildBanner.tsx` unused; `components/AuthNav.tsx` lines 375–384; BUILD-READINESS §10.8; `tests/ui-audit-followups.test.ts` is source-string checks only.

11. **Under-13 / COPPA is advisory copy only** · K–8 chess pilots · Signup says a guardian “should help”; terms say the same. No verifiable consent, no school-official path, DOB stored and **exported**. Privacy explicitly disclaims COPPA compliance — keep that honesty; do not treat copy as a control · **P0 for child cohorts · M** · Evidence: `components/SignupForm.tsx`; `app/terms/page.tsx`; export `date_of_birth`; BUILD-READINESS §10.2.

12. **Cookie / processor disclosure gap** · Session cookies + Sentry/OpenAI/GitHub with no notice · No cookie or analytics banner; privacy “service providers” list hosting/auth/DB/email only. Enrichment (`OPENAI_API_KEY`) and optional Sentry are out of the notice. Counsel must decide, not product copy · **P1 · S** · Evidence: `app/privacy/page.tsx` providers section; `.env.example` OpenAI + `SENTRY_DSN`; ingest workflow secrets.

13. **Docs still describe a pre-0063 world** · Ops will follow stale gates · `ROADMAP.md` still unchecked “account export/delete… observability”. BUILD-READINESS §5.5 (Aug 8) still says export/delete “not built” and “no PR CI”. `SETUP.md` recommended order still “through… `0063`” while the same file’s intro cites `0066` · **P2 · S** · Evidence: those three files vs `0063` + `.github/workflows/ci.yml`.

## Must-build before go-live

1. **Confirm Vercel plan in the dashboard and leave Hobby.** Paid clubs and district contracts are commercial use. Move to Pro at minimum (cron `*/5` after Pro, email support, log drains, team seats). Treat Enterprise as a fork if a district SLA requires it. Recheck fair-use vs 20k SSR (`force-dynamic` account/org/admin routes).
2. **Define production promotion.** One hostname `app.causey.dev`; only promote a green CI SHA; record env inventory (`DATA_SOURCE`, Supabase, Resend, `CRON_SECRET`, `SENTRY_DSN`, GitHub token). Close the current ~5-day `dev` vs production gap.
3. **Turn on real error monitoring.** Official Sentry SDK (or equivalent) on server + `error.tsx` / `global-error`; alerts to a named owner for search, cron, auth, and 5xx. Prove one test 500 arrives. Empty DSN must be a launch **fail**, not a no-op.
4. **Run and log the restore drill** (runbook §9) into a throwaway project: admin login, district CSV, zip search. Write RPO/RTO, PITR on/off, and how DSAR deletion interacts with backups. Do not put student rows in git.
5. **Counsel-approved legal pack for paid clubs + district pilots:** privacy/terms that name processors (Vercel, Supabase, Resend, Sentry, OpenAI, GitHub Actions), subscription/cancel language (club SaaS ≠ student dues), DPA/security addendum, retention schedule, breach contacts. **Do not claim FERPA certified.** Keep the current disclaimer until counsel replaces it.
6. **Finish DSAR/offboarding:** rate-limit export; expand export to attendance/comments/groups without other people’s PII; stop CASCADE-deleting org drafts; stop erasing `admin_audit_log` on self-delete; district-directed and org-offboard procedures; ops path for `account_has_review_history`.
7. **Support + incident:** privacy@ or ticket inbox (not only `causey.dev` / Google Calendar); hours, severity, response targets; status page; named on-call; after-action. `/admin/users` stays for repairs, not the public front door.
8. **Accessibility go-live bar:** skip link; single `main`; mount or delete `EarlyBuildBanner` per design rule; axe (or equivalent) in CI; keyboard + screen-reader pass on signup, search, Family, org RSVP, reports CSV, Your data; VPAT only if a buyer asks — do not invent one.
9. **Under-13 decision with counsel** before any paid student cohort under 13: consent vs school-authorized vs block signup; whether DOB is retained after age-band derivation.

## Open questions for the owner

1. **Vercel billing plan today** — Hobby vs Pro vs trial? The API did not return plan; repo + cron assume Hobby. This is a hard commercial/ToS fork before charging clubs.
2. **Is `SENTRY_DSN` set in production, and did a test 500 ever land?** Unknown / fail-closed.
3. **Was the backup restore drill ever recorded in the private deployment log?** Unknown / fail-closed.
4. **Legal path for districts:** DPA as school vendor / “school official” vs any FERPA *certification* product (the latter must stay off the site). Who is counsel of record?
5. **Custom-portal SLA** — Pro uptime vs Enterprise/support contract? That choice drives hosting plan and on-call cost, not UI.
6. **Paid club terms** — refunds, cancellation, who the customer is (coach vs 501(c) vs parent), and whether student-data terms apply to a $monthly club the same as a district.
