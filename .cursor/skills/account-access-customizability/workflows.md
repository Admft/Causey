# Workflow agents

Copy **one** agent checklist per tick. Mark each account type **Enough / Thin / Missing / Over-grant / Not their job**.

Shared evidence dirs: `app/account`, `app/orgs`, `app/family`, `app/me`, `app/claim`, `app/admin`, `lib/org-permissions.ts`, `lib/invitations/claim-path.ts`.

---

## Agent 1 — Signup, claim, identity

Routes: `/signup`, `/login`, `/claim`, `/join/[code]`, `/account`

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Student | role tile, name, zip, grade | join code; not staff signup | join is student-only |
| Parent | role tile; cannot eat a student session | Family after signup | cannot mint staff |
| Coach | role tile → club/team create, not district | staff claim uses invited email | invitation role is source of org access |
| Claimed school/district staff | signup shows exact invited role | complete invited email before Auth | membership ≠ rewrite of `profiles.role` |
| Platform admin | account experience on `/admin/users` | filters, founder lock | cannot drop founder platform admin |

---

## Agent 2 — Account settings and alerts

Routes: `/account`, `/me/notifications`

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Every signed-in | profile fields, password, prefs per notification kind, export/delete | org rows labeled with exact membership | leave org without extra roles |
| Parent | household unlink / pending requests | per-child, not a roster | cannot grant org roles from Account |
| Staff | persona label matches membership (not “Coach” for district admin) | shortcuts to the right workspace | — |

---

## Agent 3 — Discover, save, Plan

Routes: `/`, `/chess` (and other directories), event page, `/me`

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Signed-out | zip/distance on search; no fake account | chess usable; other types honest | — |
| Student | interests + shortcut; “my club/school is going” | save, RSVP, Plan | — |
| Parent | same search; acts on Family not Plan-as-self | linked-child Going | — |
| Coach | type filters for the club they run | Bring roster is staff-only | — |

---

## Agent 4 — Family desk

Routes: `/family`, event Going / Invite / Mark complete

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Parent | which child, Going/Can't go/Clear | invite → Plan → mark complete | cannot staff-enter a school they do not coach |
| Student | accept on Plan | see recorded results blanks honestly | — |
| Staff | — | team-entry labeled `staff` | only roster they may operate |

---

## Agent 5 — Club / team workspace

Routes: `/clubs`, `/orgs/new`, `/orgs/[slug]`, settings

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Owner | name, state, website, meeting note, type locked | create club/team only | People hides school/district admin |
| Coach | operate events/roster | season path | no Remove/rotate if they cannot succeed |
| Assistant | none | read-only | — |
| Student | leave | join link | — |

---

## Agent 6 — Roster, groups, join

Routes: roster, groups, join code

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Club owner/coach | groups, CSV, join link | assistants read-only | join code student-only |
| School admin | groups + **Assign groups** | wait-state if staff unassigned | coaches see assigned groups only |
| School coach | none until assigned | no roster redirect loop | — |
| District admin | no district student roster | Staff console without student names | — |

---

## Agent 7 — Staff invites and access grants (priority)

Routes: `/orgs/[slug]/people`, Staff, `/admin/users`, `/admin/organizations` membership

This is the **super-customizable grant** agent. Read [access-grants.md](access-grants.md) first.

| Actor | Can grant only | Must not grant |
| --- | --- | --- |
| Club admin | student, coach, assistant | school_admin, district_admin |
| School admin | school_admin, coach, assistant, student + group assignment | district_admin on the school; unscoped whole-roster coaches |
| District admin | district_admin, coach, assistant on district; school staff **on the school** | students on the district org |
| Platform admin | account experience, platform flag, membership upsert with type-fit | self platform toggle; founder unlock drop |

Check: role help copy, default invite role, claim email bind, revoke/reissue, last-admin guards.

---

## Agent 8 — Travel to public events

Routes: event page, Bring your roster, manage invites, search “club/school going”

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Club/school coach | which org is attending (chooser) | mark going, invite roster/group | district office cannot travel (no roster) |
| Student/parent | Going vs invite RSVP language | teammate names, same org only | — |

---

## Agent 9 — Host competitions

Routes: `/orgs/[slug]/competitions/new`, preview, publish, edit

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Host coach/admin | type + discipline chips, audience, cover, edit/cancel | draft → preview → review for public | district-only audience only when hierarchy allows |
| Assistant | — | no create | — |
| Platform | public listing review | — | — |

---

## Agent 10 — Attendance and results

Routes: manage, attendance, roster history, Plan/Family outcome copy

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Operator coach | attendance, division/place/award blanks honest | travel + hosted | school coach: assigned groups only |
| Assistant | — | read | no writes |
| Parent/student | view outcomes | same language as Reports | — |

---

## Agent 11 — Reports and season file

Routes: reports, CSV export, district Reports, overview season board

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Club owner | season CSV (hosted + travel) | trophy/season board | — |
| School admin | school report | — | not other schools |
| District admin | aggregate, type filter, school vs district hosted | fail closed CSV | no student browsing |
| Coach | — | club season they operate | — |

---

## Agent 12 — School program

Routes: school overview, People, Staff, settings `#`, claim handoff

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| District admin | add school, handoff | readiness next action | temporary school owner labeled honestly |
| School admin | full roster/staff | claimed admin is not stuck on “Delegate” | delegated peers, owner guards |
| Coach/assistant | assigned groups | wait-for-assignment mission | — |

---

## Agent 13 — District office

Routes: `/districts`, `/orgs` district landing, Schools, Reports, Activity, announcements

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| District admin | announcement audience, school picker | one next action, calendar, isolation | delegated district admins only |
| District coach | — | competitions only | no office tabs |
| Platform | provision district | no self-serve create | — |

---

## Agent 14 — Platform admin

Routes: `/admin/*`

| Type | Customizability | Features | Grants |
| --- | --- | --- | --- |
| Platform admin | user filters, org create/verify/delete, support queue | membership search | type-fit roles; confirm copy |
| Founder | account experience on protected rows | school/district delete with slug confirm | platform admin stays on |

---

## Agent 15 — Phone companion

Routes: mobile Search, Family, Me, orgs, event Going, alerts

Same grant rules as website. Phone must not create, CSV, or settings. Coach Bring-roster is coach-only. Unsigned stays quiet.
