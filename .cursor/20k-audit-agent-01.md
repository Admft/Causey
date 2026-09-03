# Agent 1 — Club SaaS commercial

## Scope covered
`.cursor/20k-full-audit-roles.md`; `ROADMAP.md`; `docs/CAUSEY-BUILD-READINESS-AND-FUTURE-TIMELINE-2026-08-08.md` §§9.3, 11.1–11.4, Phase 3, later/high-risk; `docs/club-feature-overview.md`; `.cursor/club-readiness.md`; `.cursor/skills/club-owner-readiness/SKILL.md` + `out-of-scope.md`; `.cursor/district-ux-progress.md` (account billing = Out); `app/clubs/page.tsx`; `app/orgs/new/page.tsx`; `app/account/page.tsx`; `app/signup/page.tsx`; `app/terms/page.tsx`; `app/privacy/page.tsx`; `app/districts/page.tsx` (price copy, contrast only); `app/orgs/[slug]/settings/page.tsx`; `components/SignupForm.tsx`; `components/OrgCreateForm.tsx`; `components/HomeDistrictPitch.tsx`; `components/ExternalRegistrationPanel.tsx`; `components/AdminUserAccessForm.tsx`; `lib/org-permissions.ts` (`canCreateOrg`); `lib/actions/orgs.ts` (`createOrg`); `lib/actions/signup-guard.ts`; `lib/notifications.ts` (`NOTIFICATION_KINDS`); `lib/email/enqueue.ts`; `package.json`; `.env.example`; `vercel.json`; `SETUP.md` §9; `supabase/migrations/0009_accounts.sql`, `0010_organizations.sql`, `0011_org_access.sql`, `0015_platform_admins.sql`, `0025_district_lifecycle_guardrails.sql`, `0056_profile_competition_category.sql`, `0065_club_profile_org_about.sql`; greps for `stripe`, `subscription`, `entitlement`, `billing`, `invoice`, `plan`, `price_id`; `app/api/**` (six routes, none payment); no `lib/billing*` / `lib/entitlement*` files.

## Verdict
**Missing** — at 20k users with clubs/teams paying Causey a monthly SaaS fee, this slice has no commercial product. There is no plan catalog, entitlement model, checkout, invoice, cancel, or failed-payment dunning. Any unlocked coach can create unlimited club/team/school workspaces for free (`canCreateOrg` + `createOrg` + RLS `orgs_insert_coach_or_platform_admin`). Public club copy still advertises “No billing or Stripe” and folds student dues together with organizer entry fees. Students and parents are not paywalled (correct default for club-pays SaaS). Districts remain meeting-booked, not club checkout. **Fail-closed:** no payment provider is installed; do not invent one beyond the stated preference of Vercel Marketplace payments / Stripe if this must be built.

## Keep
- Organizer-entry vs Causey coordination is already honest: RSVP is not payment (`ExternalRegistrationPanel`; `/clubs` “Families still finish paid entry on the organizer’s site”). Do not turn SaaS checkout into student dues or tournament fees.
- Students and parents cannot create orgs (`canCreateOrg` coach-only). Discovery stays usable without an account. Keep those audiences off the club invoice.
- Districts are not self-serve (`HomeDistrictPitch` meeting CTA vs club signup). Do not reuse club monthly checkout for district contracts.
- No fake club prices are published.
- `profiles.role_unlocked` / `is_unlocked_coach` is an abuse kill switch, not a plan. It is a usable *hook* for suspend-after-dunning, not an entitlement system.
- `/account` Organizations panel and org Settings are natural homes for a future billing owner UI; they currently have no payment surface.

## Findings
1. Payment stack · no Stripe, Vercel payments SDK, `price_id`, webhooks, or billing env · a paying club cannot check out · **P0 · L**
2. Tenant subscription state · no `subscriptions` / invoices / entitlements tables; `organizations` has no plan/customer columns · **P0 · L**
3. Public club pitch · “Dues” + “No billing or Stripe” conflates student dues, organizer fees, and Causey SaaS · **P0 · M** · `app/clubs/page.tsx`
4. Self-serve create · `/signup?role=coach` → `/orgs/new` with no plan or payment · **P0 · L**
5. Who is gated · coaches fully ungated (`role_unlocked = true`); students/parents correctly off the invoice · **P0 · M**
6. Unlimited workspaces · “Create another organization” with no plan or club-count cap; coaches may create `school` type for free · **P1 · M**
7. Invoices / cancel / customer portal · `/account` and org Settings have no billing · **P0 · L**
8. Failed-payment dunning · no past-due state, grace, suspend, or payment-failed email · **P0 · M**
9. Roadmap still specifies the wrong Stripe · in-app org-event fees, not club SaaS · **P0 · S** · `ROADMAP.md`
10. Docs treat for-profit as district contracts, not monthly club SaaS · **P1 · M**
11. Legal · Terms/Privacy do not cover a paid club subscription · **P1 · M**
12. Entitlement architecture · no centralized plan-check module · **P0 · L**
13. Copy elsewhere repeats “not a billing product” · **P1 · S**
14. Existing clubs at go-live · grandfather vs hard-paywall is unknown / fail-closed · **P1 · M**

## Must-build before go-live
1. Club/team monthly plan catalog (SKU). Do not sell student dues or organizer entry on this SKU.
2. Tenant subscription state (org-scoped) + centralized entitlement reads.
3. Self-serve checkout for club/team create (Vercel Marketplace payments / Stripe if payments must exist — not installed).
4. Gate coach/org mutation. Keep search, student join, parent Family/Plan off the paywall unless priced.
5. Billing owner UI on org Settings + `/account` deep link.
6. Webhooks + dunning: past_due → email → grace → suspend writes → cancel.
7. Replace “No billing or Stripe” / dues-as-SaaS copy.
8. Kill or relabel `ROADMAP.md` in-app event-fee Stripe item.
9. Paid-service terms and processor env/secrets. No invented prices.
10. Admin visibility: paying / past_due / canceled clubs. No self-serve district checkout in this work.

## Open questions for the owner
- Price and unit: flat monthly per club/team vs roster-size tiers vs one invoice for several teams? Trial length?
- Already-created free clubs: grandfathered, trial, or hard-paywalled?
- Coach-created `school` orgs: same SKU, forbidden, or district-contract only?
- Confirm student dues and in-app tournament fees stay out.
- Vercel Marketplace payments vs Stripe Checkout/Billing, plus tax/VAT.
