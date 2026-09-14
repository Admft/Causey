# Expected customizability by account type

What each type should be able to change **themselves**, and what they should **not**. Actual code lives in `/account`, org Settings, People, Staff, and `lib/org-permissions.ts`.

## Person accounts

### Student
**Should customize:** display name, DOB/age band, state, zip, interests, tournament shortcut, grade, typed USCF/NSDA/other IDs, per-kind alert prefs, family-link responses, leave club/school.
**Should not:** create orgs, invite staff, change own `profiles.role` or `role_unlocked`, browse other students’ plans.
**Features they need in workflows:** search, save, RSVP, Plan, join code, “my club/school is going.”

### Parent
**Should customize:** same profile + zip as needed, per-kind alert prefs, which children are linked, RSVP/organizer-registration for linked children.
**Should not:** a club roster, staff invites, district reports, create orgs.
**Features they need:** Family desk (invite → Plan accept → mark complete), Going/Can't go/Clear, alerts for each child.

### Coach / organizer (person account)
**Should customize:** profile + zip, alert prefs, which club/team they create (type locked after create).
**Should not:** self-serve district or school create; escalate to platform admin.
**Features they need:** `/orgs/new` club/team only, then whatever membership they hold (below).

## Membership roles

### Club / team owner
**Should customize:** name, state, website URL, meeting note, join code rotate, ownership transfer, announcements, event audience (public / club-or-team only / invite-only — never fake district-only).
**Should grant:** student, coach, assistant (not school/district admin). CSV + claim links.
**Should not:** district tabs, school-admin role, student dues.

### Club / team coach (not owner)
**Should customize:** roster/groups they operate, travel mark, hosted event fields they created.
**Should not:** rotate join code, remove members, transfer ownership (admin-only).

### Club / team assistant
**Should customize:** nothing operational. Read roster/events they can see.
**Should not:** mutate roster, publish, mark attendance, invite.

### School administrator
**Should customize:** school settings, verification next-step copy, groups, who is assigned to which group, staff/student invites, school-hosted event audience (including district-only when the school has a parent district).
**Should grant:** school_admin (delegated), coach, assistant, student. Assign coaches/assistants to **one or more groups** after claim.
**Should not:** district-wide reports of other schools; create a district.

### School coach (assigned groups)
**Should customize:** events and invites **inside assigned groups only**.
**Should not:** see the whole school roster until assigned; operate unassigned groups.

### School assistant
**Read-only** on assigned groups. No roster/invite/attendance/result writes.

### District administrator
**Should customize:** which schools exist, announcement audience (staff vs families; which schools), district-hosted event audience, delegated district admins (with owner/self/last-admin guards).
**Should grant:** district_admin, coach, assistant on the **district** org (not students, not school_admin on the district row). School staff is granted **on the school**.
**Should not:** student-by-student browsing; a district student roster; mixed club IA.

### District competition-only coach / assistant
**Should customize:** district-hosted competitions they can operate (coach) or read (assistant).
**Should not:** Schools / People / Reports / Activity office tabs.

### Platform admin / founder
**Should customize:** other people’s **account experience** (student/parent/coach); platform-admin flag (not on self; not off for founders); org membership upsert with org-type role fit; provision/verify/delete district or school.
**Should not:** silently rewrite a claimed staff person’s global role into a destructive persona; invent partner district names.

## Shared “thin” knobs (every signed-in type)

- `/account`: profile, password, data export/delete, notification prefs (`lib/notifications.ts` kinds), household links, org list with exact membership labels.
- No per-user feature flags, no custom dashboard widgets, no vanity theme.
