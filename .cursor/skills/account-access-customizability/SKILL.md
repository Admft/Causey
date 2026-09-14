---
name: account-access-customizability
description: Audits every Causey workflow for each account type — whether that account can customize what it should, which features are missing, and whether access can be granted only to the right roles and scopes (named roles, group assignment, org-type invite limits, not arbitrary ACLs). Use when checking customizability, permissions, access grants, account types, role consoles, People invites, missing features per student/parent/coach/admin, or when the user asks for workflow agents.
---

# Account-access customizability

Work as a **grant auditor**. For every workflow, walk **every account type that touches it** and score three things:

1. **Customizability** — can this person change the settings, labels, audience, groups, and prefs that role should control?
2. **Missing features** — is a job they should do in this workflow absent, dead, or owned by the wrong type?
3. **Access grants** — can an authorized person grant **only** the right membership / account type / scope (not “everyone is coach,” not Salesforce permission sets)?

Causey’s grant model is **named roles + scoped assignment**, not a checkbox ACL. Score against that bar. See [access-grants.md](access-grants.md).

## Always read first

- `.cursor/account-access-readiness.md` (living backlog)
- [account-types.md](account-types.md)
- [access-grants.md](access-grants.md)
- [workflows.md](workflows.md) — run **one named workflow agent** per tick, or all if the user asked for a full pass
- Club or district buyer work: matching skill + backlog (do not mix club IA into district chrome)

## Account types (do not invent more)

**Person accounts** (`profiles.role`): `student` · `parent` · `coach`

**Membership roles** (`org_memberships.role`): `student` · `assistant_coach` · `coach` · `admin` (legacy) · `school_admin` · `district_admin` · plus **Owner** (`owner_profile_id`)

**Org types**: club · team · school · district

**Platform**: platform admin · founder super-admin

A club owner is a **coach account** with club/team ownership — not a fourth signup type.

## How to run a workflow agent

1. Pick one row from [workflows.md](workflows.md). Copy its checklist.
2. For each account type listed on that row, open the primary routes (and live UI when a server is up).
3. Score each type:

| Score | Customizability | Features | Access grants |
| --- | --- | --- | --- |
| **Enough** | They can change what that role should | Job exists end-to-end | Invite/assign grants only the intended scope |
| **Thin** | Some knobs exist; one that matters is missing | Job works with friction | Role exists but over- or under-grants |
| **Missing** | No settings for a job they own | Job absent or dead-end | Cannot grant this type without extra access |
| **Over-grant** | — | — | This type can do work they should not, or invite a role that does not fit the org |
| **Not their job** | Skip; do not invent settings | Skip | They must not be able to grant this |

4. Write findings into `.cursor/account-access-readiness.md` (type · workflow · surface · gap · why it hurts · S/M/L).
5. Ship only if the user asked. One grant/customizability win per tick. Branch `dev` only.

## Evidence

Cite route + symbol (`OrganizationPeopleManager`, `invitationRoleFitsOrganization`, `is_assigned_group_staff`, RLS helper). Fail closed: if evidence is missing, say **unknown**, not “probably fine.”

Do not invent partner names, listings, fees, or counts. Do not promise custom portals, per-tab ACLs, or FERPA theater.

## Additional resources

- Expected knobs per type: [account-types.md](account-types.md)
- Grant matrix (what “only certain access” means here): [access-grants.md](access-grants.md)
- Workflow agents: [workflows.md](workflows.md)
- What not to build: [out-of-scope.md](out-of-scope.md)
