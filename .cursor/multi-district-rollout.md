# Multi-district rollout mission (2 districts)

Living coordination brief. Do **not** name real districts or schools in code, commits, UI copy, or this file.

## Goal
Make Causey ready to operate **two independent school districts** in parallel: separate tenants, clear school vs club identity, guided staff workflows, student-readable UI, no cross-district leakage.

## Hard rules
- Branch: `dev` only. Never touch `main`.
- Design system + anti-vibecode. No fake polish badges. No fabricated listings/counts.
- One shippable end-to-end win per agent tick (not chrome nits).
- Update `.cursor/district-ux-progress.md` after each ship.
- Do not invent new scrape paths.

## Agent lanes (do not cross)
| Agent | Model | Owns | Does not own |
|---|---|---|---|
| UI | `kimi-k3-max` | Visual composition, density, school-account affordances, student readability, portal/roster/manage surfaces | Schema/migrations, RLS, server actions beyond copy wiring |
| Backend / workflow | `gpt-5.6-sol-high` | Multi-tenant isolation, provisioning, readiness workflows, reporting, RLS/actions, district ops checklist | Pure visual redesigns / spacing |
| Coordinator | `inherit` (auto) | Priority lock, scope police, conflict resolution, usage-guard enforcement | Implementing large features itself unless both lanes are blocked |

## North-star checklist (multi-district)
- [ ] Two districts can coexist without shared roster/report bleed
- [ ] Platform admin can provision/verify District A and District B independently
- [ ] District admin sees only their schools; school account chrome is unmistakable vs club/team
- [ ] School staff workflows: create school → invite admin → claim → ownership → students → events
- [ ] Student/parent surfaces stay plain-language, dense, one next action
- [ ] Aggregate reports stay PII-safe and district-scoped
- [ ] Empty/error/success states always name the next action
- [ ] Mobile portals: no viewport eaten by chrome; sticky next action where needed

## Audit snapshot (coordinator, 2026-08-12)
Repo evidence (no real district/school names):

**Already in place for a single assisted pilot**
- Hierarchy + roles: migrations `0018`–`0035` family; platform-only districts; child schools; district/school admin; staff claim links; ownership transfer; verification + guarded bulk verify (`0034`).
- Readiness model + district command center: `lib/district-readiness.ts`, `lib/data/district.ts`, district workspace next-action stages.
- Aggregate reports + private CSV: `get_district_school_rollup` RPC; export gated to district admins.
- Ops path: `docs/district-pilot-runbook.md` (two-district provision + §7 live isolation smoke); email/cron/Resend called out; migrations through `0046` required on target env.
- Progress file marks single-district pilot must-haves done; legal/owner gates remain outside build.

**Still blocks “2-district ready enough”**
1. **Ops (not code):** target Supabase must apply through `0046` (`0044` security gate + `0045` atomic school create + `0046` district-hosted reporting) and pass runbook §7 live bidirectional smoke. Static N=2 tests + dual-district runbook are in-repo; live proof is not.
2. Residual assisted-ops honesty on **claim → ownership handoff → verification Needs-correction** recovery (acceptance criterion 5 on the handoff path). School identity chrome and broader district/school next-action honesty already shipped.
3. Local/target migration ledger reconciliation remains an ops risk if an environment only records early versions despite partial later effects — verify before `migration repair` / `db push`.

**No longer blocking (repo-shipped this cycle)**
- Explicit N=2 static isolation suite + dual-district runbook sequencing.
- Atomic district-admin school create (`0045`).
- Fail-closed readiness/report reads; platform-admin dual-district readiness summary.
- District-hosted competition attribution (`0046` + Reports/CSV).
- School-account identity chrome; district/school next-action honesty (incl. redirect-loop fix).

**Kill list (do not work this tick)**
- Home / marketing band polish, hero, brand handoff
- Chess discovery chrome / scrape / ingestion
- School-safe roster/manage visual redesign (identity marker shipped; table chrome is not the pilot bar)
- Generic nav term consistency, portal motion, account settings Pilot/Legal items
- Decorative a11y-only table polish, P2 provisioning-batch history, live-RLS CI theater

## Backend readiness verdict (2026-08-12)

**Verdict: repo-ready for the N=2 assisted isolation smoke; a target
environment is not ready until migrations and the live smoke pass.** Existing
tenant boundaries are keyed by the requested district ID. This tick closed the
district-admin school-creation mismatch between `is_district_admin` and the
global-coach insert policy by moving school + initial membership creation into
one district-scoped database transaction.

### Ranked backend gaps

**P0 — must close before the N=2 smoke**
1. [x] Make child-school creation one atomic, district-scoped operation that
   accepts an active district administrator without requiring a global coach
   persona.
2. [x] Add explicit District A versus District B regression proof for organization
   visibility/membership scope, readiness and report rollups, private CSV
   authorization, mixed-district bulk verification rejection, and platform
   admin queue grouping by exact `parent_org_id`.
3. [ ] Treat the target environment as blocked unless migration validation passes
   and the Supabase migration ledger/effects include every file through `0044`
   (plus `0045`, `0046`, and any newer migration in this branch). The runbook now makes
   this gate explicit; the target environment still needs the live check.

**P1 — next after the N=2 smoke**
1. [x] Stop converting readiness/report RPC failures into truthful-looking empty
   districts. `lib/data/district.ts` previously returned `[]` or built from
   nullable query results when reads failed, which could mislabel an outage as
   “add a school.” Explicit read results and retry/error surfaces shipped.
2. [x] Add a platform-admin per-district readiness summary. The admin queue
   already grouped child schools correctly in `AdminOrganizationsExplorer`,
   but did not expose delegation/provisioning readiness for two districts at
   once. Side-by-side district rows now show real readiness counts and each
   district's next workflow action.
3. [x] Define attribution for district-hosted competitions in school-by-school
   reports. `get_district_school_rollup` counts school-hosted competitions;
   migration `0041` also permits district-hosted competitions. District-hosted
   activity now appears as a separate exact-district aggregate in Reports and
   CSV, never as an inferred per-school split.

### District-hosted reporting attribution decision
- Keep school-hosted competition metrics on the exact child-school row whose
  `organizations.id` matches `competitions.org_id`.
- Report competitions hosted by the district organization as one separate
  **District-hosted** aggregate for that district. Do not distribute its
  tournaments, invitations, RSVPs, or attendance across child-school rows.
- Do not show an active-student count for the district-hosted aggregate:
  district student memberships are prohibited, and `competition_entrants`
  does not store a durable participating-school attribution. Inferring from
  current school membership would be time-variant and could double-count a
  student who belongs to more than one organization.
- Both aggregates remain authorized by the exact requested district ID. A
  failure in either aggregate fails the complete report closed; the UI and CSV
  must not publish a partial result.

**P2 — useful after assisted operations are stable**
1. Add provisioning-batch history and retry state per school; current CSV
   imports are scoped to one `org_id` but are operated one school at a time.
2. Add automated live-RLS execution in CI. Current district tests primarily
   inspect migration/action source and pure readiness behavior.

### Recommended backend build sequence
1. Ship atomic district-admin child-school creation.
2. Run the static N=2 isolation suite, then execute the runbook’s live
   two-account/two-district smoke against a migration-current Supabase target.
3. [x] Make readiness/report failures explicit and non-empty-looking.
4. [x] Add the platform-admin dual-district readiness summary.
5. [x] Keep district-hosted event totals separate from school-hosted rows.

### What shipped — isolation tick
- Added `0045_atomic_district_school_creation.sql`: exact-district
  authorization, pending child-school creation, and initial active
  `school_admin` membership now commit or roll back together.
- Updated `createDistrictSchool` to use the atomic RPC. Membership-only
  district administrators no longer depend on the global coach insert policy.
- Added `tests/multi-district-isolation.test.ts` covering exact-parent
  membership authority, readiness/rollup/CSV scoping, mixed-district bulk
  verification rejection, admin queue grouping, and the atomic action path.
- Extended `docs/district-pilot-runbook.md` with the `0044` minimum security
  gate, current `0045` requirement, independent two-district provisioning, and
  a bidirectional live isolation/CSV smoke checklist.
- Verification: 23 targeted district tests passed, migration filenames
  validated, TypeScript passed, and edited files have no linter diagnostics.

### What shipped — fail-closed reads tick
- `getDistrictPilotReadiness` now checks the district, child-school,
  membership, and pending-invitation query results. Any failed dependency
  returns an explicit failure instead of manufacturing zero schools, students,
  or administrators.
- `getDistrictSchoolRollup` now distinguishes a successful empty report from an
  RPC failure.
- District overview and Reports show bounded retry guidance when those reads
  fail; they do not show “add a school,” readiness counts, report totals, or a
  CSV action from incomplete data.
- CSV export returns a private, non-cacheable `503` JSON response when the
  rollup is unavailable instead of generating an empty file.
- Added `tests/district-data-fail-closed.test.ts`; 24 targeted district tests,
  TypeScript, ESLint, and editor diagnostics pass.

### What shipped — admin readiness tick
- `/admin/organizations` now loads readiness for every district independently
  and passes an ID-keyed result map into the existing grouped queue.
- Every district row shows its real ready-school count and current next action,
  so operators can compare two districts without opening one panel at a time.
- Expanded district details repeat the same summary and link directly to the
  existing readiness action. No counts are inferred from queue totals.
- A failed district read stays isolated to that district and displays
  “readiness unavailable” with a retry action instead of zero/ready claims.
- Added `getDistrictReadinessSummary` plus two-district and admin wiring tests;
  23 targeted tests, TypeScript, ESLint, and editor diagnostics pass.

### What shipped — district-hosted reporting tick
- Added `0046_district_hosted_reporting.sql`. The new exact-district RPC counts
  only competitions whose `org_id` is the requested district and applies the
  same upcoming, RSVP, going, and calendar-year attendance definitions as the
  school rollup.
- Added `getDistrictParticipationReport`, which returns school-hosted rows and
  the district-hosted aggregate as separate fields. If either RPC fails or the
  district aggregate is missing, the complete report fails closed.
- District Reports now show district-hosted totals in a separate section and
  explicitly state that they are not divided among schools. The school table
  remains school-hosted only.
- CSV exports add an `Attribution` column, one `District-hosted` row with no
  fabricated school or active-student value, and labeled `School-hosted` rows.
- Updated the two-district runbook migration gate and live attribution smoke
  through `0046`; added attribution, fail-closed, and exact-district tests.
  Verification: 30 targeted tests and the full 324-test suite, migration
  validation, TypeScript, ESLint, and editor diagnostics pass.

## Active priorities (locked — max 3)
1. **Ops / Parent — target env through `0046` + live dual-district smoke**  
   Acceptance criteria 2, 3, and 6. Apply/verify migrations through `0046` on the intended Supabase project (`0044` security gate + `0045` + `0046`), then execute runbook §6 workflow smoke and §7 bidirectional isolation/CSV smoke. Ops work — not agent migration theater. Record pass/fail in the private deployment log.
2. **UI — assisted-ops recovery on claim → ownership → Needs-correction** ✅ shipped  
   Claimed-admin pending-ownership mission, ownership empty/non-owner honesty, Needs-correction re-queue copy (pilot contact; save alone does not flip status).
3. **Backend — smoke-failure remediation only (no greenfield)**  
   Attribution (`0046`), atomic school create (`0045`), fail-closed reads, dual-district admin readiness, and static N=2 isolation are shipped. Backend works only if env apply or live smoke exposes an isolation, report, ownership-transfer, or claim-action defect. No P2 batch-history / live-RLS CI / scrape work.

Prior batch (complete): N=2 isolation + runbook; school-account identity; district/school next-action honesty; verification Needs-correction deep-link; district-hosted reporting attribution.

## Acceptance criteria — “2-district ready enough for assisted pilot ops”
All must be true without naming real districts/schools in product copy:

1. **Independent provision:** Platform admin can create + verify District A and District B from `/admin/organizations` as separate tenants; each district’s school list/bulk-verify set is parent-scoped (no mixed-district bulk verify).
2. **No cross-tenant bleed:** A district admin for A cannot read B’s schools, readiness rows, rollup metrics, or CSV export; school staff in A cannot administer B resources.
3. **Dual smoke:** Runbook includes a two-district assisted-ops checklist: provision A → provision B → school delegate on each → one school workflow smoke per district → confirm reports stay district-scoped.
4. **School identity:** First-session school staff can tell they are in a school account (not a club/team) from overview + roster + manage chrome alone.
5. **Guided recovery:** On district/school setup and invite failure/empty states, UI names the single next action (no dead ends, no provider/migration dumps).
6. **Env gate:** Target pilot project has migrations through `0046` applied and ledger/effects verified (`validate:migrations` / `supabase migration list` clean through `0044`+`0045`+`0046`); product email cron + claim-link fallback path documented as in the runbook. **Ops — not code.**
7. **Public safety:** Zero real partner district/school names, logos, or counts on public marketing surfaces (unchanged business constraint).

**Acceptance gap honesty (2026-08-12 re-lock):** Criteria 1, 4, and 5 are repo-met for assisted ops (5 still has a thin handoff/Needs-correction recovery residue — Active priority 2). Criteria 2–3 are statically tested + runbook-written but **not live-proven** until Active priority 1 passes. Criterion 6 is env/ops only. Criterion 7 unchanged.

Out of scope for this bar: self-service district signup, payments, account delete/export, scrape coverage, home marketing, full mobile chrome pass, school roster/manage visual redesign, legal packaging.

## Usage guard
- **Other models first:** keep UI/Backend on `kimi-k3-max` / `gpt-5.6-sol-high` until **other models ≥ 50%**.
- **Then Cursor models:** switch ALL agents to Cursor models (`composer-2.5-fast` / `cursor-grok-4.6-high`, coordinator may stay `inherit`) until **Cursor models ≥ 40%**.
- **Then restore other models** and repeat the cycle.
- Mode file: `.cursor/model-usage-mode.json`
- **2026-08-12 parent:** other **39%**, Cursor **2%** → stay `premium` (other models). Next switch when other hits 50%; after that, stay on Cursor until Cursor hits 40%.

## Conflict protocol
If both agents need the same file: Backend owns data/actions; UI owns presentation components. Coordinator resolves ties toward district readiness over polish.

## Coordinator notes (2026-08-12 re-lock)
- **Branch:** `dev` (confirmed). No commit from coordinator. No large feature implemented this tick.
- **Usage:** other 39% / Cursor 2% → stay `premium` (other models). Do not flip modes. Switch to Cursor only when other ≥50%; stay on Cursor until Cursor ≥40%, then restore other models.
- **Attribution status:** `0046_district_hosted_reporting.sql` + Reports/CSV + tests are in-repo (was “in flight”; now shipped). Env gate is through `0046`, not `0045`.
- **Re-lock rationale:** Original Active 1–3 are repo-complete. Real remaining acceptance blockers are live env smoke (ops) and thin ownership/Needs-correction recovery honesty. Kill home/chess/scrape and roster table redesign.
- **STOPPED (2026-08-12 parent):** Multi-agent district push halted on user request. Usage-guard loop killed. Do not resume UI/Backend/Coordinator until parent relaunches.
- **Lane check:** Prior WIP notes still apply; chess discovery remains kill-listed. Coordinator found no tiny dual-district code blocker worth shipping this tick — sequencing + ops gate is the work.
- **Prior ships (kept for history):** school-account identity; district/school next-action honesty; Needs-correction deep-link from district settings; N=2 isolation + `0045`; fail-closed reads; admin dual-district readiness; district-hosted reporting `0046`.
- **UI shipped (2026-08-12, priority 2):** Claim → ownership → Needs-correction recovery — a claimed school admin awaiting the handoff now gets an honest overview mission ("Ownership handoff is pending": district acts from this school's settings, staffing can continue) and matching settings#ownership copy instead of the dead "Only the current owner can transfer"; the ownership empty state explains the invitee must claim their invitation before appearing as a transfer target, with a people-workspace link; the rejected-verification state names the real re-queue path (correct + save, then the Causey pilot contact re-queues for platform review — saving alone does not flip status) and the save-success message repeats it for rejected records. Presentation only; no action/RLS changes. tsc + eslint + 32 district/UI tests clean.
