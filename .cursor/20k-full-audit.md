# 20k / paid club / custom district portal — full audit

**Date:** 2026-09-02  
**Target:** ~20k mixed users, clubs paying Causey a **monthly SaaS** fee (not student dues / organizer entry), school districts with **custom portals and custom features**.  
**Mode:** read-only synthesis of ten agents. Not a FERPA certification. No invented prices, partner names, or user counts.

**Open beside chat:** canvases/causey-20k-paid-club-district-audit.canvas.tsx

Per-slice reports: `.cursor/20k-audit-agent-01.md` … `10.md`  
Assignment: `.cursor/20k-full-audit-roles.md`

---

## Verdict

**Not ready.** Zero of ten slices are Ready for this commercial target. Three are **Blockers** (email, isolation, ops/legal). Club billing and custom portals are **Missing**. Five slices are **Partial**: the assisted chess coordination spine on the shared `/orgs/[slug]` shell is real and should be kept.

That spine is a **pilot product** (chess search, Family RSVP, coach season walk, platform-provisioned districts, fail-closed aggregate reports). It is not 20k self-serve clubs on a monthly invoice, and it is not per-district portals with custom features.

## Slice scoreboard

| # | Slice | Verdict | P0 (raw) | One line |
| --- | --- | --- | --- | --- |
| 1 | Club SaaS commercial | Missing | 9 | No plans, checkout, invoices, cancel, or dunning. |
| 2 | District custom portals | Missing | 9 | Shared `/orgs/[slug]` only; no host, brand, or feature matrix. |
| 3 | Identity at 20k | Partial | 5 | Model is solid; Auth stampede + NAT signup + under-13 advisory. |
| 4 | Security and isolation | Blocker | 2 | Coach can hitch a school under any district UUID. |
| 5 | Data plane at 20k | Partial | 4 | Anonymous chess browse holds; signed-in + district host does not. |
| 6 | Notifications and email | Blocker | 7 | Hobby once-a-day cron cannot drain 20k or district fan-out. |
| 7 | Paying club product | Partial | 1 | Season walk exists; past travel vanishes; School chrome after `/clubs`. |
| 8 | District + school program | Partial | 5 | Chess spine real; office totals type-blind; no school-of-origin. |
| 9 | Discovery and families | Partial | 5 | Chess + Family work; banner unmounted; STEM claims VEX; comments unsafe. |
| 10 | Ops, legal, a11y, support | Blocker | 8 | Hobby cannot sell SaaS; Sentry unused; no restore proof, support, or incident. |

Raw P0 counts are per-slice before de-duplication.

## Keep (do not rebuild)

- Students and parents ungated; RSVP is not payment; districts stay meeting-booked (not club checkout).
- Chess zip radius SQL (`0061`), public page size cap 100, anonymous search cache.
- Claim tokens hashed at rest; account role frozen vs org membership role; platform admin separate table.
- Portal reads on user JWT + RLS, not service role. Club A cannot `get_org_roster` Club B. Exact-district rollups abort unless `is_district_admin`.
- Skip-locked email outbox, Resend idempotency, kind prefs, guardian RPCs.
- Platform-only district create, atomic child-school create, fail-closed district CSV (not an empty file).
- Honest `/privacy` / `/terms` (no FERPA/COPPA claim), self-serve export/delete, CI.

## Merged P0 themes

1. **No club SaaS stack** — no catalog, subscription state, checkout, invoices, dunning.
2. **“No billing or Stripe” copy** — trains buyers Causey will never charge; conflates dues vs organizer fees vs SaaS.
3. **Custom portals do not exist** — one host, one cookie, globally unique slugs; custom features have nowhere UUID-keyed to live.
4. **District hitchhike** — unlocked coach `INSERT` school with any `parent_org_id`, then sees that district’s `audience='district'` events. District UUID already leaks on public `competitions.org_id`.
5. **Hobby cron + commercial ToS** — `0 14 * * *`, 50s drain; Hobby is non-commercial.
6. **Email cannot drain** — unbounded enqueue; silent `{ ok: true }`; claim mail waits until ~14:00 UTC; volume unproven.
7. **Signed-in search is a 200-row JS window** — paying coaches and district staff hit this every zip search.
8. **District office load** — cartesian rollup; invite-all unbounded; readiness dumps every membership row.
9. **Auth stampede** — `getUser` on almost every signed-in request; no React `cache()`.
10. **Under-13 is helper text** — DOB stored and exported; privacy disclaims COPPA.
11. **Past travel vanishes** before day-of attendance/results can be finished from the workspace.
12. **January every-type brief vs live chess pitch** — office reports type-blind; `/districts` still sells assisted chess.
13. **Discovery honesty holes** — `EarlyBuildBanner` unmounted; STEM metadata names VEX; missing `reg_url` labeled club-invite; public comments with no report/under-13 gate.
14. **Ops not commercial** — homemade Sentry almost unused; restore unlogged; no support inbox, status, or on-call; terms have no subscription language.

## Must-build sequence

### Wave 0 — hard stop

1. Confirm Vercel plan; leave Hobby for Pro. Restore product-email to at least `*/5`. Empty `SENTRY_DSN` fails launch.
2. Reject unauthorized `parent_org_id` on INSERT (force `create_district_school`). Live SQL test with two JWTs.
3. Bound email enqueue; report remaining outbox; send org/claim mail off the daily batch; set-based announcement fan-out.
4. Pick **one** January story: shared shell (as the January `.tex` actually promises) **or** custom portals as a later SKU. Do not leave both documents in circulation.

### Wave 1 — commercial product

5. Club/team monthly plan catalog (students/parents stay free). Org-scoped subscription + centralized entitlements.
6. Self-serve checkout via **Vercel Marketplace payments / Stripe** (not student-fee Stripe from `ROADMAP.md`). Billing owner UI; dunning → grace → suspend writes.
7. Gate coach/org mutations. Unlimited extra workspaces only if the plan says so.
8. Replace “No billing or Stripe” / “not a billing product.” Keep organizer-entry honesty. Relabel ROADMAP in-app event payments.
9. Counsel pack: paid terms, processors named, DPA, retention, breach contacts. **Do not claim FERPA certified.** Under-13 decision.

### Wave 2 — 20k load paths

10. Request-scoped session; NAT-aware signup; bind `consume_rate_limit` to `auth.uid()` / server IP; login/reset buckets; lock hosted Auth.
11. Signed-in radius/facets/club-going in SQL; return `total_count`; cap offset; prune rate-limit buckets.
12. Rewrite `get_district_school_rollup`; page org/event lists; one-shot `create_org_invitations`; fail-closed school season attendance.
13. Official Sentry SDK; prove a test 500; run restore drill (runbook §9); named on-call.

### Wave 3 — buyer-facing season (and portals only if sold)

14. Club Competitions include **past** travel with Manage; day-of attendance; club-native chrome after `/clubs`; search as post-roster mission for travel clubs.
15. Type-sliced district Reports/CSV; durable participating-school on district-hosted entrants; explicit type on create; Family nouns from org type.
16. Mount `EarlyBuildBanner`; fix `/stem` metadata; split invite-only vs missing `reg_url`; comments report/hide + under-13; full US (or live) state filter.
17. **If** custom portals are sold: UUID tenant registry, `Host` → `district_id`, feature allowlist, host-only cookies, cache keys include `district_id`. Ban `if (slug === …)`.

**Out unless the owner asks:** pairings, student dues, DMs, public school directory, FERPA certification, live rating lookup.

## Owner forks (must answer)

- Price unit, trial, grandfather existing free clubs; coach-created `school` type SKU.
- Confirm student dues and in-app tournament fees stay **out** of club SaaS.
- January 2027 every-type shared shell vs custom portal as a paid exhibit.
- Portal SLA: `*.causey.dev` vs district DNS; one login across club + two districts?
- May district office see **named** child-school students, or counts only?
- Under-13: COPPA consent vs school-official DPA vs block.
- Hosted Auth settings (unknown / fail-closed until read).
- Practice nights in the monthly price? Public club directory legal vs recruiting?
- Invite SLA: minutes vs same calendar day.
- Vercel plan today; is `SENTRY_DSN` set; was the restore drill recorded?

## What this audit is not

- Not permission to install Stripe or a portal host until you ask to build it.
- Not a claim that production `app.causey.dev` matches current `dev` (Agent 10: production was a promote of `dd33951`; newer `dev` was preview-only at audit time).
- Not live two-tenant RLS proof (tests are source-string checks). Isolation remaining is **unknown / fail-closed**.
