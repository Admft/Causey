# Agent 8 — District and school program

## Scope covered
Read (no edits): `.cursor/20k-full-audit-roles.md`; `.cursor/skills/district-program-readiness/{SKILL,workflows,out-of-scope}.md`; `.cursor/district-readiness.md`; `.cursor/district-ux-progress.md`; `.cursor/multi-district-rollout.md`; `.cursor/club-district-perfection-loop.md`; `docs/district-feature-overview.md`; `docs/district-pilot-january.tex`; `lib/district-readiness.ts`; `lib/data/district.ts`; `lib/data/portal.ts` (`getOrgCompetitionWorkspace`, `getOrgRoster`); `lib/competition-types.ts`; `lib/actions/{district,entrants,admin}.ts`; `lib/district-activity.ts`; `lib/org-permissions.ts`; `lib/auth/orgs.ts`; `app/districts/page.tsx`; `app/orgs/{page,new}/page.tsx`; `app/orgs/[slug]/{page,competitions,competitions/new,people,roster,reports,activity,settings}/page.tsx`; `app/orgs/[slug]/reports/export/route.ts`; `app/family/page.tsx`; `app/admin/organizations/page.tsx`; `components/{OrgSubnav,DistrictSchoolForm,OrgCreateForm,TournamentCreateForm,OrganizationPeopleManager,AnnouncementForm,HomeDistrictPitch,EntrantManager}.tsx`; migrations `0018` (`get_district_school_rollup`), `0046` (`get_district_hosted_rollup`); tests `district-*.ts`, `multi-district-isolation.test.ts`. Custom portal IA left to Agent 2; this pass is whether the **program workflow** is complete enough to hang those portals on.

**January vs live type story (program, not public search depth):**

| Type | Host school/district event | RSVP / attendance / results on same screens | District office totals **by type** | Public index (not this lane) |
| --- | --- | --- | --- | --- |
| Chess | Yes | Yes | No — lumped with everything else | Densest; still incomplete |
| Speech & debate, STEM, arts, writing | Yes (`CREATABLE_COMPETITION_TYPES`, inventory type filter) | Yes | No | Incomplete / thin |
| Custom (`other`) | Yes; no category directory | Yes | No | None |

The January brief (`docs/district-pilot-january.tex`) promises the **same district workflow for every type** and **school-level totals across those types**. The live product can **host** every type on the shared screens. The **district office** still cannot tell chess from debate in Reports/CSV. Public `/districts` and the home organizer board still sell an **assisted chess pilot**.

## Verdict
**Partial** — the assisted **chess** spine is real and should not be rebuilt: platform-provisioned district → child schools → named claim-link staff → school roster/CSV → school **or** district-hosted events (audiences + review) → Family RSVP/organizer registration → fail-closed aggregate Reports/CSV + scoped Activity. That spine is what a custom portal should wrap. It is **not** ready for ~20k mixed users, a January every-type office, or hanging custom championship/program features: office analytics are type-blind, district-hosted events have no participating-school attribution, invite-all and readiness reads are unbounded, create-competition still defaults to chess, Family still says “club,” and there is no program entity (one school roster, nameless groups) for a debate office vs a chess office to hang on. Isolation is statically tested, not live-proven (ops). Email at school volume is unproven (Agent 6). Custom portal tenancy/branding is Agent 2; this slice says the **data and jobs** those portals would call are incomplete.

## Keep
- Platform-only district create (`OrgCreateForm` drops `district`; `/orgs/new` copy; `/admin/organizations`).
- Atomic child-school create + claim-link school admin + ownership handoff with district authority retained (`createDistrictSchool`, readiness stages in `lib/district-readiness.ts`).
- District chrome: School/District account marker; no district student roster (roster redirects to `#schools`); district People is staff-only.
- One next action + per-school readiness; upcoming calendar with host **and** type label; competitions inventory with type + host filters; host chooser (district-wide vs school).
- Audiences public / district-only / school-only / invite-only; public events through review.
- Connected-school invite + announcement fan-out to child schools.
- Family desk: per-child RSVP + unfinished organizer registration + recorded-result line (org-agnostic inbox).
- Reports: school-hosted vs district-hosted split; CSV `503` JSON on rollup failure (not an empty file); Activity scoped RPC, not raw audit.
- Fail-closed readiness on the district overview; assistants read-only.

## Findings
1. **January every-type office vs chess-only pitch** · `/districts` H1 and `HomeDistrictPitch` MODE_COPY.district still say “Chess for a whole district” / “assisted chess pilot”; `docs/district-feature-overview.md` says chess is the working surface; January `.tex` says Causey “will be the district's coordination layer for every scholastic competition type,” same screens, totals across types · A 20k district that signed the January brief will expect debate/STEM/arts/writing **office** work, not only hostable listings next to a chess pitch · **P0** · **M**

2. **District Reports/CSV have no competition-type dimension** · `get_district_school_rollup` / `get_district_hosted_rollup` count all `competitions` for the org; `DistrictSchoolRollup` / export headers are Attribution, School, students, upcoming, RSVP, going, attended — no category · January promised “not a separate chess report and a pile of spreadsheets for everything else”; a custom portal cannot hang a chess-vs-debate dashboard on today’s RPC · **P0** · **M**

3. **District-hosted events have no participating-school attribution** · `0046` states there is no durable entrant-to-school attribution; `inviteConnectedSchoolRosters` upserts `competition_entrants` only (`competition_id`, `profile_id`) · Custom “which schools sent kids to the district championship” will invent or time-vary counts (dual membership). This is the main hang-off hole for district-wide custom features · **P0** · **L**

4. **Invite every connected school is one unbounded request** · `inviteConnectedSchoolRosters` `Promise.all(getOrgRoster)` for every child school, then `inviteEntrants` upserts all IDs and fans in-app + guardian notifications in the same action · At a 50-school / thousands-of-students championship this hits function timeouts and partial notify; 20k mixed users make this the district-wide path · **P0** · **L**

5. **District-office reads dump memberships and full inventories** · `getDistrictPilotReadiness` selects **every** active `org_memberships` row on every child school to count students/admins; `getOrgCompetitionWorkspace` loads all statuses/drafts for district + all schools; overview shows `districtUpcoming.slice(0, 8)`; Activity `p_limit = 50` with no type/host filter · Custom portals inherit the same load; a large urban district overview is not a 20k-safe command center · **P0** · **L**

6. **No program entity to hang custom per-type features on** · `Organization` is `school|district|club|team` only (no program/category); `OrgGroup` is `{id, org_id, name}` · One school roster serves chess and debate; groups are free-text. A custom “debate program office” has nowhere typed to attach except slug-if forks (Agent 2) or misusing groups · **P1** · **M**

7. **District office cannot export recorded results** · School attendance CSV includes Division / Place / Award (`export/route.ts` non-district branch); district participation CSV does not; district Reports UI has no results section · January: “Place or award after attendance. Export when a board asks.” Board packet today is RSVP/attendance counts only · **P1** · **M**

8. **Create-competition silently defaults to chess** · `TournamentCreateForm` `savedDraft?.category ?? initial?.category ?? "chess"` · Coaches hosting UIL speech or a science fair can publish a chess-typed event if they skip the type tiles; that poisons type-sliced reports later · **P1** · **S**

9. **Family desk still uses club nouns on the district path** · `app/family/page.tsx`: “RSVPs tell the club who’s coming”; empty orgs: “Not in any club yet.” · Linked school/district families will read the parent desk as a club product; custom district portals cannot reuse this copy as-is · **P1** · **S**

10. **School season attendance fail-open** · `getOrgSeasonAttendance` returns `[]` on RPC error; school Reports then look like “no attendance” · A district admin opening a school report can treat an outage as zeros (district rollup itself fails closed — this is the child-school hole) · **P1** · **S**

11. **Provisioning is one school at a time** · `DistrictSchoolForm` posts one name/state then routes to that school’s People · Assisted chess ops is fine; a January cohort of dozens of schools is still hand-walked; no district-level student CSV (by design — students live on schools) · **P2** · **M**

12. **Staff/student CSV is 500 rows per import** · `bulkInviteOrganizationMembers` rejects `lines.length > 501`; district import requires a role column and blocks student/school-admin roles · Large high-school first load is multi-file; not a blocker for a small pilot, friction at 20k · **P2** · **S**

13. **Activity is a 50-row untyped feed** · `getDistrictAdminActivity(districtId, limit = 50)`; labels include competition created/status but not category · At mixed-type volume, championship publishes bury school-create / ownership events the office uses during provision · **P2** · **S**

## Must-build before go-live
1. **Decide and publish one type story** on `/districts` + district overview: either “assisted chess pilot; other types can be hosted but office totals are combined” (honest now) or ship type-sliced office analytics before anyone treats the January `.tex` as the contract. Do not leave both documents in circulation as if they agree.
2. **Type-sliced district Reports + CSV** (school-hosted and district-hosted), plus a results export the board can use — blanks mean not recorded. This is the hang-off for any custom “program dashboard.”
3. **Durable participating-school on district-hosted entrants** (or an explicit “unknown school” bucket). Without this, do not sell custom district-championship school breakdowns.
4. **Bound the office path:** readiness counts via aggregate RPC (not full membership dump); competitions calendar/activity pagination; `inviteConnectedSchoolRosters` batched with progress, not one upsert of the district.
5. **Require an explicit competition type** on create (no silent chess default).
6. **Family copy:** school/district/club nouns from the child’s actual orgs, not “club.”
7. **Fail-closed school season attendance** the same way district rollup already fails closed.
8. **If custom per-type portals are in scope:** add a typed program/group (or org-level program tags) so Agent 2 is not forking `/orgs/[slug]` on slug strings. Do not invent a second roster.

Not this role: custom domain/branding/tenancy shell (Agent 2); club SaaS checkout (Agent 1); RLS policy bodies (Agent 4); email/outbox volume proof (Agent 6); public search coverage (Agent 9).

## Open questions for the owner
1. **Is the January 2027 every-type brief the commercial commit**, or is the live offer still an assisted **chess** pilot until type-sliced reports exist? The two docs currently contradict each other; a district lawyer will pick the January PDF.
2. **Custom portal model:** shared spine + feature flags, or per-district forks? This lane can add program tags and type rollups; it cannot SLA a separate portal per district (Agent 2). Dual-enrolled students make school-of-origin on district events a product/legal choice, not just a column.
3. **Price / FERPA / retention / public school directory** remain owner/legal; product should stay fail-closed and unnamed. No evidence in this slice that those are settled.
