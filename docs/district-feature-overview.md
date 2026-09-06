# Causey for school districts

**Shareable January 2027 pilot brief (district audience):** `docs/district-pilot-january.tex` (PDF: `docs/district-pilot-january.pdf`). That document is future tense: what the district will have by January, across every competition type.

**This page** is the internal current-state catalog for agents. Do not send it to a district as if it were the January package.

**Audience:** district administrators, school administrators, and program coordinators  
**Product:** Causey (`https://causey.dev`)  
**Date:** August 24, 2026  
**Status:** Assisted chess pilot. Not a self-serve district product and not a finished procurement package. Club/team owners use a separate self-serve workspace (`docs/club-feature-overview.md`); this page is district + school only.

Causey helps a district run scholastic competition programs without giving the central office a copy of every student’s browsing history. Families can search public chess tournaments for free. A district pilot uses the same organization workspace as schools — not a custom portal. A vanity host is a later unsold SKU (local `/portals` layout only). Chess is the working surface; other types can be hosted. The pilot still adds the school-side work: getting the right people onto the right teams, telling families about events, recording who attended, and giving the district participation totals.

Setup is hands-on. Causey creates the district record with you. Causey does not list a school, a coach, or a student on the public site before the district signs.

Chess is the working surface. Other competition types exist in the product but are not the district pitch.

---

## What people in the district can do

### District office
- Hold a **district account** that oversees connected schools, not a single club page pretending to be a district.
- **Add schools** and see each school’s setup status (administrator assigned, ownership handed off, roster started) on the district overview **and** on Schools settings — not verification labels alone.
- Follow **one next action** on the district overview instead of a dump of every setting.
- Invite **district staff** without giving them student-by-student browsing access.
- Open **Reports** for school-level totals: students on roster, upcoming events, pending RSVPs, going, and attendance.
- Export those totals as **CSV**.
- See **district-hosted** events separately from **school-hosted** events, so a district tournament is not counted as if every school ran it.
- Publish **announcements** to district staff, every connected school, or the schools you pick (school staff and/or students and linked parents).
- Host a **district-wide competition** when that is the real host, or leave hosting with a school.
- After schools are provisioned, open a **competitions calendar** of district-hosted and school-hosted events (host name on each row) instead of stopping at empty totals.
- On a district-hosted event, **invite students from connected school rosters** (or every connected school at once). Districts have no student roster of their own.
- After inviting across schools, **follow RSVPs and attendance by school** on the same manage page (organizer-registration status included when the listing has an external registration URL).

### School administrators
- Receive a **named invitation** and claim a school account. No shared passwords.
- Take **ownership** of the school workspace after claim.
- Invite coaches, assistants, students, and families.
- Import staff or students from **CSV**, with a row-by-row error list when a file fails.
- Manage **school settings**, verification, and the people list.
- See school-hosted competitions and school reporting.

### Coaches
- Run a **roster** and **groups** (for invites and attendance).
- Create competitions as **drafts**, preview them, then publish.
- Choose who can see an event: **public**, **district-only**, **school-only**, or **invite-only**.
- Invite students, collect **RSVPs**, and see who still needs to finish **organizer registration** on the tournament’s own site.
- Record **attendance** and review a **season attendance** view.
- Post short **announcements** (“Bring boards Saturday”).
- Edit or cancel a hosted event after it is published.

### Parents
- Link to a child account and use a **family desk**: which child still needs an RSVP or still needs to finish organizer registration.
- Get **alerts** for invites, deadlines, and schedule changes (in the app; email follows the same types when delivery is running).

### Students
- Search **chess tournaments** by zip and distance without creating an account.
- Create an account to **save** events, **RSVP**, keep a **plan**, and join a school or club with a join link.

### Platform (Causey staff, not the district)
- Create and verify the district.
- Review **public** school-created events before they appear in the public directory.
- Help with corrections when a school record needs more detail.

---

## Feature list

| Feature | What it does | Ready for a chess pilot? |
| --- | --- | --- |
| Public chess search | Indexed US chess listings by zip, radius, date, grade, rating, fee, and source | Yes, with incomplete coverage |
| Qualification pathways | Chess pathway explorer for selected series; “Get your kid to chess nationals” pin above chess search | Illustrative scaffolding; swap in verified US Chess rules when they arrive; confirm with the organizer |
| District → school structure | One district over many schools | Yes, Causey-assisted |
| Role-based access | District, school, coach, assistant, parent, student each see their own work | Yes |
| Claim-link provisioning | Email or copyable invite plus a typable activation code; CSV import/export via one set-based RPC; reissue; Causey super admin can provision a district or a child school | Yes |
| Rosters and groups | School/club roster, groups for invites and attendance | Yes |
| Hosted competitions | Draft → preview → publish; public events go through Causey review; district inventory includes child-school hosts; district-hosted manage invites connected-school rosters, stamps school of origin, and labels replies by school | Yes |
| Event audiences | Public, district-only, school-only, invite-only | Yes |
| RSVP and attendance | Going / not going (student, parent, or staff team-entry), attendance on the day, season view | Yes |
| Organizer registration tracking | Families mark when they finished the external registration | Yes |
| Family follow-through | Parent inbox of named child actions, including Going on public listings without a school roster invite; signed-in phone event shows who from the school marked going | Yes |
| Announcements | Short notes from district or school staff; district overview can post to chosen schools or every connected school, and choose staff vs students/parents | Yes |
| Alerts | Invites, deadlines, 7-day and 1-day reminders, changes, cancel | Website `/me/notifications` and phone `/alerts` (same `notifications` table); email is configured but not yet proven at school volume |
| Aggregate reports + CSV | School-level counts, type filter, participating-school origin on district-hosted invites; not student browsing | Yes |
| Privacy and terms pages | Public disclosures of what student data is stored; processors named | Published; legal review still required before a paid student rollout |
| Custom district portal | Vanity host, UUID allowlist, host-only cookie | Layout only (`/portals`); January stays shared `/orgs` |

---

## What Causey does not do yet

Do not promise these in a district conversation:

- Instant district signup or a public school directory
- In-app entry fees, payments, or registration that replaces the organizer’s site
- Coach–parent messaging threads
- A complete index of speech, debate, STEM, arts, or writing events
- A finished price, contract, SLA, or FERPA/state-privacy certification
- A live custom portal, vanity domain, or per-district feature pack (local `/portals` layout only)
- Automated proof that every student-data request (export, delete, retention) is complete for procurement

Before a paid student rollout, Causey and the district still have to settle price, support, privacy, how long data is kept, and security, and Causey has to prove email delivery at school volume.

---

## How a pilot is set up

1. **Causey sets up the district** after written approval. The district is not a self-serve signup.
2. **Each school is created under that district** (by Causey or the district office), then handed to the named school administrator.
3. **Staff invite their own people** with join links and claim links.
4. **Coaches run events**; families RSVP and finish organizer registration off-site.
5. **The district reads totals**, not individual student browsing records.

Anyone can search tournaments on Causey for free. A district pilot is the coordination layer on top of that search.

To talk through a pilot: use the booking link on [causey.dev/districts](https://causey.dev/districts).
