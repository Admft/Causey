import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contextualOrganizationRoleLabel } from "@/lib/portal-copy";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district and school role boundaries", () => {
  const boundaries = source(
    "supabase/migrations/0097_district_school_role_boundaries.sql"
  );
  const scopedReads = source(
    "supabase/migrations/0098_role_console_reads_and_district_invites.sql"
  );
  const claimHandoff = source(
    "supabase/migrations/0099_district_claim_owner_handoff.sql"
  );

  it("protects owners, self-revocation, and the last administrator", () => {
    expect(boundaries).toContain("protected_owner_cannot_be_revoked");
    expect(boundaries).toContain("administrator_cannot_revoke_self");
    expect(boundaries).toContain("last_administrator_cannot_be_revoked");
    expect(boundaries).toContain(
      "create or replace function public.set_organization_administrator"
    );
    expect(boundaries).toContain("'organization.admin_granted'");
    expect(boundaries).toContain("'organization.admin_revoked'");
    expect(claimHandoff).toContain(
      "create or replace function public.guard_org_membership_authority_change"
    );
    expect(claimHandoff).toContain(
      "school.owner_profile_id = old.profile_id"
    );
    expect(claimHandoff).toContain(
      "set owner_profile_id = organization_row.owner_profile_id"
    );
    expect(claimHandoff).toContain("pg_trigger_depth() > 1");
    expect(claimHandoff).toContain(
      "session_user not in ('postgres', 'supabase_admin')"
    );
    expect(claimHandoff).not.toContain(
      "current_user not in ('postgres', 'supabase_admin')"
    );
    expect(claimHandoff).toContain(
      "district_operator_cannot_hold_school_membership"
    );
    expect(claimHandoff).toContain(
      "create or replace function public.preserve_membership_role_across_admin_grant"
    );
  });

  it("prevents direct self-promotion while preserving an audited leave path", () => {
    expect(claimHandoff).toContain(
      'drop policy if exists "memberships_update_self_or_scoped_admin"'
    );
    expect(claimHandoff).toContain(
      "create or replace function public.leave_organization"
    );
    expect(claimHandoff).toContain(
      "create or replace function public.guard_district_student_invitation"
    );
    expect(claimHandoff).toContain(
      "school_student_invitation_requires_local_staff"
    );
    expect(claimHandoff).toContain(
      "create or replace function public.get_active_guardians_for_profiles"
    );
    expect(claimHandoff).toContain(
      "public.can_operate_competition_entrant("
    );
    const leaveAction = source("lib/actions/orgs.ts").slice(
      source("lib/actions/orgs.ts").indexOf(
        "export async function leaveOrg"
      )
    );
    expect(leaveAction).toContain('.rpc("leave_organization"');
    expect(leaveAction).not.toContain('.update({ status: "removed"');
  });

  it("keeps organization settings and temporary provisioning custody out of coach identity", () => {
    const orgUpdatePolicy = claimHandoff.slice(
      claimHandoff.indexOf('create policy "orgs_update_operator"'),
      claimHandoff.indexOf(
        'drop policy if exists "announcements_select_member"'
      )
    );
    expect(orgUpdatePolicy).toContain(
      "public.can_administer_org(id, auth.uid())"
    );
    expect(orgUpdatePolicy).not.toContain("public.is_org_coach");
    expect(source("lib/data/portal.ts")).toContain(
      "!activeMembershipOrgIds.has(org.id)"
    );
  });

  it("separates inherited district setup authority from named school rosters", () => {
    expect(boundaries).toContain(
      "create or replace function public.is_local_school_admin"
    );
    expect(boundaries).toContain(
      "create or replace function public.can_view_named_org_roster"
    );
    expect(boundaries).toContain(
      "create or replace function public.can_view_org_student"
    );
    expect(scopedReads).toContain(
      "create or replace function public.get_district_staff_directory"
    );
    expect(scopedReads).toContain(
      "revoke all on function public.list_connected_school_student_ids"
    );
    expect(scopedReads).toContain(
      "district_membership.role in ('district_admin', 'admin')"
    );
    const schoolCreation = claimHandoff.slice(
      claimHandoff.indexOf(
        "create or replace function public.create_district_school"
      )
    );
    expect(schoolCreation).not.toContain(
      "insert into public.org_memberships"
    );
  });

  it("enforces assigned-group visibility and coach writes", () => {
    expect(boundaries).toContain(
      "create table if not exists public.org_group_staff_assignments"
    );
    expect(boundaries).toContain(
      "create or replace function public.is_assigned_group_staff"
    );
    expect(boundaries).toContain(
      "create or replace function public.can_operate_org_student"
    );
    expect(boundaries).toContain(
      "create or replace function public.can_operate_competition_entrant"
    );
    expect(boundaries).toContain("staff_membership.role = 'coach'");
    expect(boundaries).toContain(
      "membership.role in ('coach', 'assistant_coach')"
    );
  });

  it("keeps district event invitations aggregate-only", () => {
    expect(scopedReads).toContain(
      "create or replace function public.invite_connected_school_rosters"
    );
    expect(scopedReads).toContain("returns integer");
    expect(scopedReads).toContain(
      "create or replace function public.get_district_event_school_summary"
    );
    expect(source("lib/actions/entrants.ts")).toContain(
      '"invite_connected_school_rosters"'
    );
  });

  it("fans out child-school announcements without returning student ids", () => {
    expect(scopedReads).toContain(
      "create or replace function public.notify_org_announcement_recipients"
    );
    expect(scopedReads).toContain("returns integer");
    expect(source("lib/actions/district.ts")).toContain(
      '"notify_org_announcement_recipients"'
    );
  });
});

describe("role console navigation and branding", () => {
  it("shows exact contextual authority labels", () => {
    expect(
      contextualOrganizationRoleLabel({
        orgType: "district",
        memberRole: "district_admin",
        isAdmin: true,
        isDistrictAdmin: true,
        canViewNamedRoster: false,
      })
    ).toBe("District administrator");
    expect(
      contextualOrganizationRoleLabel({
        orgType: "school",
        memberRole: null,
        isAdmin: true,
        isDistrictAdmin: false,
        canViewNamedRoster: false,
      })
    ).toBe("District administrator");
    expect(
      contextualOrganizationRoleLabel({
        orgType: "school",
        memberRole: "school_admin",
        isAdmin: true,
        isDistrictAdmin: false,
        canViewNamedRoster: true,
      })
    ).toBe("School administrator");
  });

  it("provides first-class district and school console routes", () => {
    const subnav = source("components/OrgSubnav.tsx");
    expect(subnav).toContain('{ id: "schools", label: "Schools"');
    expect(subnav).toContain('path: "/schools"');
    expect(subnav).toContain('? "Students & groups"');
    expect(subnav).toContain('? "Coaches & staff"');
    expect(source("app/orgs/[slug]/schools/page.tsx")).toContain(
      "DistrictSchoolForm"
    );
    expect(source("app/orgs/page.tsx")).toContain("your role:");
  });
});
