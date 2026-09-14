# Account-access customizability

Living backlog for the workflow agents in `.cursor/skills/account-access-customizability/`. Club/district **buyer jobs** stay in `club-readiness.md` / `district-readiness.md`. This file is **per account type**: settings they should have, missing features, and whether access can be granted only to the right roles and scopes.

**Walk date:** 2026-09-14 · source on `dev` · public routes checked on local `npm run dev`. Signed-in consoles not live-clicked (no session in this pass).

## Verdict (2026-09-14 full walk)

Causey is **Enough** at named roles + org-type fit + school group assignment, **Thin** where a promised scope cannot be chosen at invite time, and had one **Over-grant**: platform admin (and raw membership writes) could put `school_admin` on a club/team because `guard_membership_scope` did not use `invitation_role_fits_organization`. People invites and CSV already did. **0105** closes that. District competition-only staff no longer get a dead Schools shortcut on Account.

## Scores by workflow agent

| Agent | Workflow | Headline |
| --- | --- | --- |
| 1 | Signup, claim, identity | **Enough** — three person types; parent cannot eat a student session; claim email + invitation role; join codes student-only (`0104`). |
| 2 | Account settings and alerts | **Thin** — profile/prefs/org labels work; leave is on overview not Account; alert kinds are not role-filtered (`guardian_routing` shown to students). |
| 3 | Discover, save, Plan | **Enough** for chess; other directories honest/thin; signed-out zip search works. |
| 4 | Family desk | **Enough** — invite → Plan → mark complete; Clear; staff team-entry labeled. |
| 5 | Club / team workspace | **Enough** — self-serve club/team only; type locked; People hides school/district admin. |
| 6 | Roster, groups, join | **Enough** on school assigned groups; club group “Assigned coaches” does **not** limit roster (copy says so) — **Thin** knob. |
| 7 | Staff invites and access grants | **Thin → Enough** after 0105. Invite picker + CSV type-fit. Group pick is after claim. Admin membership now type-fit. |
| 8 | Travel | **Enough** — org chooser; district cannot travel (`canMarkOrganizationAttending`). |
| 9 | Host | **Enough** — `canManageTournaments` blocks assistants; district-only audience only in hierarchy. |
| 10 | Attendance and results | **Enough** — operators write; assistants read; school coaches scoped. |
| 11 | Reports | **Enough** for owner/admin; club non-owner coach has no Reports tab (admin-only) — **Thin** if a second coach needs the season file. |
| 12 | School program | **Enough** — claim, Assign groups, wait-state, handoff. |
| 13 | District office | **Enough** after Account shortcut fix. Subnav already `showAdmin`. Schools page `isDistrictAdmin`. |
| 14 | Platform admin | **Thin → Enough** for type-fit grants (`0105`). Filters, founder lock, slug-confirm delete stay. |
| 15 | Phone | **Enough** — no create/CSV/settings; Bring-roster coach-only. |

## Grant model (keep)

- People invite picker + CSV + `create_org_invitation` use `invitationRoleFitsOrganization` / SQL twin.
  - Club/team: student, assistant, coach.
  - School: those plus school_admin.
  - District: assistant, coach, district_admin (not student, not school_admin on the district row).
- School coaches/assistants: `org_group_staff_assignments`.
- Assistants excluded from `is_org_coach`.
- Claim: invited email before Auth; `profiles.role` stays student/parent/coach.
- Platform `/admin/users`: account experience; founder platform-admin locked.
- **0105:** `guard_membership_scope` + `admin_upsert_org_membership` call `invitation_role_fits_organization`.

## Need (priority)

- [x] School admin People “Delegate this school” copy talked to a
  district operator, so a claimed administrator was asked to invite
  themselves — fixed 2026-09-14 (viewer seat + Coach default)
- [x] Run Agents 1–15 — 2026-09-14
- [x] CSV bulk invite uses the same type-fit helper as single invite — confirmed `lib/actions/district.ts`; CSV help now names allowed roles
- [x] Platform admin membership upsert type-fit — `0105`
- [x] District coach Account shortcut was Schools (redirect loop) — now Competitions
- [ ] School coach/assistant **group assignment is after claim**, not on the invite form — keep two-step unless product wants intended groups stored on the invitation (**Thin**, M)
- [ ] Alert prefs are one matrix for every person type — hide `guardian_routing` / coach-only kinds from students (**Thin**, S)
- [ ] Leave club/school lives on org overview, not Account org rows (**Thin**, S)
- [ ] Club group “Assigned coaches” does not restrict access (school assignment does) — honest copy exists; do not pretend it is grant-only (**Thin**, leave unless asked to hide)

## Out (do not build unless asked)

Salesforce permission sets, custom role names, per-tab ACL, fourth signup type, self-serve district/school, live custom portal, parents-as-staff-for-reports. See skill `out-of-scope.md`.

## Active batch

- Sitting school administrators are not asked to delegate the school;
  People invite defaults to Coach — 2026-09-14

## Last tick

- 2026-09-14 — School People “Delegate this school” was district-office
  wording. A claimed school administrator now gets staff/roster next
  steps; remaining invite-admin copy is for operators who still need a
  named school administrator.
- 2026-09-14 — Full Agent 1–15 walk. Closed Over-grant: club/team could receive `school_admin` via `/admin/users` membership upsert and `org_memberships` writes (`0105`). District coaches no longer get a Schools link that bounces. CSV import names allowed roles.

## Findings

1. Platform admin · Agent 7/14 · `AdminOrgMembershipForm` + `admin_upsert_org_membership` + `guard_membership_scope` · could grant school_admin on a club/team while People invites could not · Over-grant · M · **fixed 0105**
2. District coach · Agent 13 · `/account` · `isCoach && type === district` linked Schools; page requires `isDistrictAdmin` and redirects to overview · Over-grant (chrome) · S · **fixed**
3. School admin · Agent 7 · People invite · cannot pick groups until after claim (`org_group_staff_assignments.profile_id`) · Thin · M
4. Student · Agent 2 · `/account` alerts · `guardian_routing` (“Route student deadlines to linked guardians”) · Thin · S
5. Every signed-in · Agent 2 · Account org list · no Leave control (exists on org overview `LeaveOrgButton`) · Thin · S
6. Club owner · Agent 6 · GroupManager assigned coaches · assignment does not narrow roster (copy already says so) · Thin · S
7. Club coach (non-owner) · Agent 11 · Reports tab is admin-only · cannot download season CSV · Thin · S
8. CSV People · Agent 7 · role column was unnamed for club/school · Thin · S · **fixed help copy**
9. Parent · Agent 1 · signup gate while signed in · Enough
10. Assistant · Agent 9/10 · `canManageTournaments` false · Enough
11. Join code · Agent 1/6 · non-student blocked on `/join/[code]` · Enough
12. District office · Agent 13 · OrgSubnav `showAdmin` hides Schools/Reports/People · Enough
13. Phone · Agent 15 · no create/CSV/settings in mobile app · Enough
14. Host audience · Agent 9 · `competitionAudienceOptions` drops district-only off hierarchy · Enough
15. Profile · Agent 2 · grade field shown to parent/coach as well as student · Thin · S
16. School admin · Agent 12 · People Coaches & staff · “Delegate this school / invite a school administrator before provisioning students” is district-handoff copy; claimed admin already holds the seat · Thin (wording + false mission) · S · **fixed**
