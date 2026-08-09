# Your First Week (Updated)

Welcome to the team. The last version of this doc was written when Causey was a much smaller
project — it's grown a lot since, so the tasks below reflect where the codebase actually is now
(accounts, districts, admin, email, and ingestion are all real and working). Same philosophy as
before: bounded ownership, not "go improve the project."

**Current baseline: 237 passing tests across 39 files.** `npm run build` passes clean.

---

## First-Week Tasks

### 1. Get oriented

- [ ] Read `README.md`, `SETUP.md`, `CAUSEY-DESIGN-SYSTEM.txt`, and `anti-vibecode-rules.txt`.
- [ ] Read `docs/district-pilot-runbook.md` and `.cursor/district-ux-progress.md` — these didn't
      exist last time and explain a lot of the recent work.
- [ ] Run `npm install`, `npm test`, `npm run build`, and `npm run dev`.
- [ ] Test the public surface: `/`, `/chess`, `/event/[slug]`, `/pathways`.
- [ ] Test accounts: `/signup`, `/login`, `/me`, `/me/notifications`, `/family`.
- [ ] Test org/coach flows: `/orgs`, tournament draft creation, roster, RSVP, attendance.
- [ ] Test district flows (as far as mock data allows): district command center, school
      verification, aggregate reporting.
- [ ] Peek at `/admin` — moderation, org verification, platform user search, scraper dispatch.
- [ ] Use `DATA_SOURCE=mock`. **Don't touch `.env` or Supabase.**

**Deliverable:** a short list of confusing setup instructions, broken flows, and outdated
documentation. There's more surface area now, so this list will probably be longer than last time
— that's fine, that's the point.

### 2. Fix the outdated README (again)

- [ ] `README.md` may still undersell what exists — check whether it mentions districts, platform
      admin, product email, and the ingestion pipeline. If it reads like an early prototype, it's
      stale.
- [ ] Update it to accurately describe the current product and routes.
- [ ] Preserve the honest early-build language — don't claim compliance, completeness, or
      verification that hasn't happened. See `/privacy` and `/terms` for the tone to match.

**Acceptance:** another new developer should be able to understand what currently works — including
the district/admin layer — and run the app without help.

### 3. Audit empty, error, and success states

- [ ] Choose one workflow: `/me`, `/family`, `/orgs`, or (new option) the district command center
      or the notifications inbox at `/me/notifications`.
- [ ] Test its empty, loading, error, and successful states.
- [ ] Make sure each state clearly names the next action — this is a repo-wide pattern, so match
      it rather than inventing something new.
- [ ] Reuse existing components, tokens, and button patterns from the design system.

**Acceptance:** one focused UX improvement, tests/build passing, and before/after screenshots.

### 4. Add one meaningful regression test

- [ ] Pick a real behavior you found while auditing the app — not a wording check.
- [ ] Add or improve a Vitest test under `tests/`.
- [ ] Good candidate areas right now: RSVP behavior, notification dedupe, claim-link expiry, or
      organization-authority boundaries (all real, all under-tested relative to their importance).

**Acceptance:** show me that the test fails without the fix and passes with it.

### 5. Terminology and accessibility pass

- [ ] Audit one complete flow for keyboard access, form labels, focus states, external-link
      labels, and consistent terms.
- [ ] Keep "Causey RSVP" distinct from "organizer registration" — this distinction now also shows
      up in parent/family views and district reporting, so check those too if your flow touches
      them.
- [ ] Fix only issues in that selected flow — no site-wide rewrite.

### 6. Explore the newer systems (read-only)

The scraper and auth code are still worth understanding, but two more systems are now worth the
same treatment:

- [ ] **Authorization/RLS boundaries** — walk through how role checks work across student, parent,
      coach, school-admin, district-admin, and platform-admin. This is the area we care most about
      getting right, so understanding it now matters even before you touch it.
- [ ] **Product email** — walk through the Resend-backed outbox: how it claims jobs, retries, and
      routes to guardians vs. students.
- [ ] Still read-only. No changes to scraper, auth, or email code yet.

**Deliverable:** a short write-up per system — what it does, what looks fragile, and any questions
for me. I'd rather you ask a question here than guess and be wrong about a permissions boundary.

### 7. Document `lib/format.ts`

- [ ] While you're in there for the test task, add brief JSDoc comments to each exported function.
- [ ] Note any inputs/outputs that seem ambiguous or under-tested.
- [ ] Keep it factual — describe what the code does, don't guess at intent you're unsure of.

---

## For Every Task

- Work only on `dev`; never touch `main`.
- Pull `origin/dev` before starting.
- Run `npm test` and `npm run build`.
- Update `.cursor/district-ux-progress.md`.
- Make one focused commit and push only to `origin/dev`.
- Ask Cursor to explain unfamiliar code before you edit it.

## Where to Start

Same as before: your best first coding task is adding or extending a test under `tests/` for
something in `lib/`. It's bounded, low-risk, and teaches you the test setup without touching auth,
data, or district logic.

Before you start, run this — I already have some local changes sitting in the repo:

```
git status
```

---

## Longer-Term Ownership

Once the first week is done, pick one of these areas to own. A few are new or reshaped since the
last version of this doc:

- **New-developer experience** — keep setup docs, architecture notes, and onboarding checks
  accurate as the surface area keeps growing.
- **Workflow QA** — rotate weekly through student, parent, coach, org-admin, *and now
  district-admin* flows; turn findings into one bounded fix at a time.
- **Regression testing** — add coverage whenever you find a real bug or confusing state. Right now
  live authorization testing (proving role boundaries against a real database, not just SQL text)
  is the single highest-value area if you want to grow into it — but that starts as a pairing task,
  not a solo one.
- **Accessibility** — maintain keyboard, labeling, focus, mobile, and reduced-motion quality
  across one route group. No formal WCAG audit has happened yet, so early groundwork here is
  genuinely useful.
- **Data-trust research** — verify tournament/pathway facts against official sources and record
  citations — never invent or silently "correct" data. This now also covers the Texas Chess
  Association feed and the qualification-pathway rules, both added recently.

---

## Off-Limits for Now

Still strictly off-limits until we pair on them directly:

- Supabase migrations, RLS policies, and production environment variables.
- Any change to the scraper or auth/permissions code (read and explore only, per Task 6).
- Product email (Resend config, cron, outbox logic) — read and explore only.
- Anything involving student privacy, data export/deletion, or under-13 handling — this is an
  active, unfinished area and mistakes here have real consequences.

If a task pulls you toward any of these, stop and ask rather than working around it.
