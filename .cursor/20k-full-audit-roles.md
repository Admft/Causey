# 20k / paid-club / district-portal full audit — agent assignment

**Date:** 2026-09-02  
**Repo:** `/Users/MacBook/Documents/Projects/Causey`  
**Mode:** read-only source + UI/UX audit. Do not edit, commit, or switch branches.

## Product target (overrides older “no billing” copy for this audit)

Causey must be **fully ready** for:

1. **~20,000 users** (students, parents, coaches, school/district staff — mixed).
2. **Clubs and teams pay Causey a monthly subscription** (SaaS entitlement). This is distinct from collecting student dues or replacing organizer entry fees. Student-fee / Stripe-for-dues remains a separate product decision; call it out if the code or copy conflates the two.
3. **School districts are first-class**, with **custom portals** and **custom features** (not only the shared `/orgs/[slug]` district workspace used today). Isolation between districts is a hard gate.
4. Discovery still covers **chess, speech and debate, STEM, arts, writing**. Chess is densest today; the audit must say what is missing for every type at 20k, not pretend chess-only.

Older skills (`club-owner-readiness`, `district-program-readiness`) still define **workflows and out-of-scope floor tools** (pairings, DMs, public school directory, FERPA theater). They do **not** override the commercial target above.

## Shared output format (every agent)

Return markdown only, in this exact shape:

```
# Agent N — <role name>
## Scope covered
(files/routes actually read)
## Verdict
Ready | Partial | Missing | Blocker  — one paragraph for THIS slice at 20k + paid clubs + custom district portals
## Keep
- what already works; do not rebuild
## Findings
1. Surface · gap · why it hurts at 20k / paid club / custom district · P0|P1|P2 · S|M|L
(8–15 findings, evidence: path + symbol)
## Must-build before go-live
Numbered list of work items this role owns. No other agent’s work.
## Open questions for the owner
Only real forks (price, legal, custom-portal SLA). No fake unanswered trivia.
```

Do not invent partner district names, listings, fees, or user counts. If evidence is missing, say **unknown / fail-closed**, not “probably fine.”

## The 10 roles (no overlap)

| # | Role | Owns | Must not duplicate |
| --- | --- | --- | --- |
| 1 | Club SaaS commercial | Monthly plans, entitlements, self-serve club checkout, invoices, cancel, dunning, who is gated | Student dues, district contracts |
| 2 | District custom portals | Per-district portal, custom features, branding, tenancy model vs shared org shell | Club billing, family desk internals |
| 3 | Identity at 20k | Auth, sessions, roles, claim/join, under-13, password/email, rate limits on auth | RLS policy bodies, email content |
| 4 | Security & isolation | RLS, two-district isolation, club isolation, CSP, admin, secrets, abuse | Billing UX, search ranking |
| 5 | Data plane at 20k | Postgres/search/ingestion/cache/page size, zip radius, scrape health under load | Email templates, org UX copy |
| 6 | Notifications & email | Outbox, Resend, cron, prefs, guardian routing, volume for 20k | Stripe, scraper parsers |
| 7 | Paying club product | End-to-end club/team season UX for a paying coach | District hierarchy, billing checkout |
| 8 | District + school program | Provision → school → events → reports → activity; what “custom features” would hang off | Club SaaS checkout |
| 9 | Discovery + families | Public search, event page, Plan, Family, signup, 20k first-run UX | Admin scrapers, RLS SQL |
| 10 | Ops, legal, a11y, support | Vercel/prod, Sentry, backups, export/delete, a11y, support load, incident | Feature UX polish |

Each agent reads the shared docs that touch its slice, then **indexes code and UI** in its file list. Primary routes are in `app/**/page.tsx` (45 pages). Design truth: `CAUSEY-DESIGN-SYSTEM.txt`, `anti-vibecode-rules.txt`.
