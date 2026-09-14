# Access grants — “only certain access / account types”

Causey should feel **super customizable at the role-and-scope layer**, not as a permission-set product.

## Intended model (keep)

| Layer | What you grant | Enforced by |
| --- | --- | --- |
| Person account | `student` / `parent` / `coach` | Signup + `/admin/users` (founders can change experience, not drop their own platform admin) |
| Membership | Exact `OrgMemberRole` that **fits the org type** | `invitationRoleFitsOrganization`, People role picker, RLS |
| School scope | Coach/assistant → **assigned groups** | `org_group_staff_assignments`, `is_assigned_group_staff` |
| District office vs ops | `district_admin` (office tabs) vs `coach`/`assistant_coach` (competitions only) | Role consoles `0097`–`0100` |
| Event who-can-see | public / district / school / invite_only | Audience helpers + insert guards |
| Announcements | staff vs students/parents; which child schools | District overview chooser |
| Platform | platform admin vs founder lock | `AdminUserAccessForm` |

Owner, current admin, and last active admin cannot be removed. Districts cannot have student or school-admin **memberships** on the district row.

## What “Enough” looks like for grants

An authorized inviter can:

1. Pick **only roles that fit** that org (club cannot offer School administrator; district cannot invite students onto the district org).
2. Name the access in plain language **before** claim (office vs competition-only vs assigned-group vs read-only).
3. **Narrow after claim** where the product promises it (Assign groups; unassign; revoke invite; reissue).
4. Fail closed: unassigned school coach does not get the whole roster; assistant cannot mutate; district office cannot open student browsing.

## What is **not** the bar

Do not score as Missing:

- Arbitrary permission checkboxes (“reports but not People”)
- Custom role names per district
- Per-tab ACL or feature-flag tables
- White-label portals / vanity DNS (`/portals` is layout only)
- Granting a parent a staff membership so they can “just see reports”

Those belong in [out-of-scope.md](out-of-scope.md) unless the user explicitly asks.

## Over-grant (always a finding)

- Inviting a role that does not fit the org type
- Club coach seeing Remove / rotate-join-code that only admins can run
- District `coach` landing on Schools/Reports
- School coach seeing students outside assigned groups
- Assistant writes (roster, attendance, results, announcements)
- Platform admin grant without confirm, or self-grant, or unlocking `role_unlocked` as a fake plan
- Claim signup that creates a generic coach **before** the invitation role binds

## Code to read first on grant ticks

- `lib/invitations/claim-path.ts` (`invitationRoleFitsOrganization`, account role for claim)
- `lib/org-permissions.ts`
- `components/OrganizationPeopleManager.tsx` (`INVITABLE_ROLES`, `inviteRoleHelp`)
- `components/OrganizationStaffConsole.tsx`
- `components/AdminUserAccessForm.tsx` / `AdminOrgMembershipForm.tsx`
- `lib/actions/groups.ts` (`set_group_staff_assignments`)
- migrations `0035`, `0097`, `0098`, `0100`
