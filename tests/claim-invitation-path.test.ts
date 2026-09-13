import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accountRoleForOrgInvitationRole,
  buildClaimCodePath,
  buildClaimPath,
  claimSignupHref,
  extractClaimCode,
  extractClaimToken,
  invitationEmailHintMatches,
  invitationRoleFitsOrganization,
  isClaimNextPath,
  isJoinCodeNextPath,
  isStaffOrgInvitationRole,
} from "@/lib/invitations/claim-path";

describe("claim invitation path helpers", () => {
  it("maps staff org roles to coach accounts and students to student", () => {
    expect(accountRoleForOrgInvitationRole("student")).toBe("student");
    expect(accountRoleForOrgInvitationRole("assistant_coach")).toBe("coach");
    expect(accountRoleForOrgInvitationRole("coach")).toBe("coach");
    expect(accountRoleForOrgInvitationRole("school_admin")).toBe("coach");
    expect(accountRoleForOrgInvitationRole("district_admin")).toBe("coach");
    expect(isStaffOrgInvitationRole("school_admin")).toBe(true);
    expect(isStaffOrgInvitationRole("student")).toBe(false);
  });

  it("builds plain claim links and extracts tokens from next paths", () => {
    const token = "a".repeat(64);
    expect(buildClaimPath(token)).toBe(`/claim/${token}`);
    expect(extractClaimToken(`/claim/${token}`)).toBe(token);
    expect(extractClaimToken(`/claim/${token}?from=invite`)).toBe(token);
    expect(extractClaimToken("/join/CODE")).toBeUndefined();
    expect(isClaimNextPath(`/claim/${token}`)).toBe(true);
    expect(isJoinCodeNextPath("/join/CODE")).toBe(true);
  });

  it("treats a typed activation code as a claim path too", () => {
    expect(buildClaimCodePath("bcdf-ghjk")).toBe("/claim?code=BCDFGHJK");
    expect(extractClaimCode("/claim?code=BCDFGHJK")).toBe("BCDFGHJK");
    expect(extractClaimCode("/claim?code=bcdf-ghjk")).toBe("BCDFGHJK");
    expect(isClaimNextPath("/claim?code=BCDFGHJK")).toBe(true);
    expect(accountRoleForOrgInvitationRole("district_admin")).toBe("coach");
  });

  it("rejects codes with the wrong shape or lookalike characters", () => {
    expect(extractClaimCode("/claim?code=BCDF")).toBeUndefined();
    expect(extractClaimCode("/claim?code=BCDFGHJKM")).toBeUndefined();
    expect(extractClaimCode("/claim?code=BCDFGHI0")).toBeUndefined();
    expect(extractClaimCode("/claim")).toBeUndefined();
    expect(extractClaimCode(`/claim/${"a".repeat(64)}`)).toBeUndefined();
    expect(isClaimNextPath("/claim?code=nope")).toBe(false);
  });

  it("keeps district and school invitation roles scoped", () => {
    expect(invitationRoleFitsOrganization("district", "coach")).toBe(true);
    expect(invitationRoleFitsOrganization("district", "student")).toBe(false);
    expect(invitationRoleFitsOrganization("district", "school_admin")).toBe(
      false
    );
    expect(invitationRoleFitsOrganization("school", "school_admin")).toBe(true);
    expect(invitationRoleFitsOrganization("school", "district_admin")).toBe(
      false
    );
    expect(invitationRoleFitsOrganization("club", "school_admin")).toBe(false);
    expect(invitationRoleFitsOrganization("club", "coach")).toBe(true);
    expect(invitationRoleFitsOrganization("team", "assistant_coach")).toBe(
      true
    );
  });

  it("wires reissue and bulk claim export for people provisioning", () => {
    const inviteActions = readFileSync(
      resolve(process.cwd(), "lib/actions/district.ts"),
      "utf8"
    );
    const peopleManager = readFileSync(
      resolve(process.cwd(), "components/OrganizationPeopleManager.tsx"),
      "utf8"
    );
    const peoplePage = readFileSync(
      resolve(process.cwd(), "app/orgs/[slug]/people/page.tsx"),
      "utf8"
    );
    const loginPage = readFileSync(
      resolve(process.cwd(), "app/login/page.tsx"),
      "utf8"
    );

    expect(inviteActions).toContain("buildClaimPath(row.claim_token)");
    expect(inviteActions).toContain("reissueOrganizationInvitation");
    expect(inviteActions).toContain("claims: BulkInviteClaimRow[]");
    expect(peopleManager).toContain("Reissue & copy link");
    expect(peopleManager).toContain("Filter invitations by status");
    expect(peopleManager).toContain('id: "pending"');
    expect(peopleManager).toContain('id: "revoked"');
    expect(peopleManager).toContain("text-brand-red");
    expect(peopleManager).toContain("Download CSV");
    expect(peopleManager).toContain("Copy all claim links");
    expect(peopleManager).toContain("Copy code");
    expect(peopleManager).toContain("type the code at /claim");
    // District People defaults to office admin, not Coach (hollow first session).
    expect(peopleManager).toContain('orgType === "district" ? "district_admin"');
    expect(peopleManager).toContain("Office access: schools, people, reports");
    expect(peoplePage).toContain('isSchoolAdminSetup || needsSchoolAdminHandoff');
    expect(peoplePage).toContain('"district_admin"');
    expect(loginPage).toContain("getInvitationPreviewForClaimPath");
    expect(loginPage).toContain("Create staff account");
  });

  it("masks invitation emails and blocks a clearly mismatched signed-in mailbox", () => {
    expect(
      invitationEmailHintMatches("jordan@school.edu", "j***@school.edu")
    ).toBe(true);
    expect(
      invitationEmailHintMatches("alex@school.edu", "j***@school.edu")
    ).toBe(false);
    expect(
      invitationEmailHintMatches("jordan@other.edu", "j***@school.edu")
    ).toBe(false);
    expect(claimSignupHref("/claim/abc", "student")).toBe(
      `/signup?role=student&next=${encodeURIComponent("/claim/abc")}`
    );
    expect(claimSignupHref("/claim/abc", "school_admin")).toBe(
      `/signup?role=coach&next=${encodeURIComponent("/claim/abc")}`
    );

    const auth = readFileSync(
      resolve(process.cwd(), "components/ClaimInvitationAuth.tsx"),
      "utf8"
    );
    const tokenPage = readFileSync(
      resolve(process.cwd(), "app/claim/[token]/page.tsx"),
      "utf8"
    );
    const codePage = readFileSync(
      resolve(process.cwd(), "app/claim/page.tsx"),
      "utf8"
    );
    expect(auth).toContain("This invitation is for a different email");
    expect(auth).toContain("Sign out to use the invited email");
    expect(auth).toContain(
      "`/login?next=${encodeURIComponent(next)}`"
    );
    expect(auth).toContain("Create a staff account, then Causey assigns");
    expect(tokenPage).toContain("ClaimInvitationAuth");
    expect(tokenPage).toContain("autoAccept");
    expect(codePage).toContain("ClaimInvitationAuth");
    expect(codePage).toContain("autoAccept");
  });
});

describe("staff claim auto-accept", () => {
  it("auto-accepts when the signed-in mailbox matches and repeats are a no-op", () => {
    const tokenButton = readFileSync(
      resolve(process.cwd(), "components/ClaimInvitationButton.tsx"),
      "utf8"
    );
    const codeButton = readFileSync(
      resolve(process.cwd(), "components/ClaimCodeInvitationButton.tsx"),
      "utf8"
    );
    const loginPage = readFileSync(
      resolve(process.cwd(), "app/login/page.tsx"),
      "utf8"
    );
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0096_claim_and_admin_membership_context.sql"
      ),
      "utf8"
    );
    expect(tokenButton).toContain("autoAccept");
    expect(codeButton).toContain("autoAccept");
    expect(loginPage).toContain(
      "Create a staff account with your own password"
    );
    expect(loginPage).not.toContain("Create a coach or organizer account");
    expect(migration).toContain("target.status = 'claimed' and target.claimed_by = auth.uid()");
    expect(migration).toContain(
      "grant execute on function public.claim_org_invitation_by_code(text)\n  to authenticated"
    );
  });

  it("hands a provisioned district to the matching claimant, not the super admin", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0099_district_claim_owner_handoff.sql"
      ),
      "utf8"
    );
    expect(migration).toContain(
      "create or replace function public.handoff_provisioned_district_owner_on_claim"
    );
    expect(migration).toContain("new.claimed_by");
    expect(migration).toContain(
      "lower(coalesce(auth_user.email, '')) = lower(new.email)"
    );
    expect(migration).toContain("membership.role = 'district_admin'");
    expect(migration).toContain(
      "organization.owner_profile_id = organization.created_by"
    );
    expect(migration).toContain("platform.super_admin");
    expect(migration).toContain(
      'create policy "memberships_insert_non_admin_or_platform"'
    );
    expect(migration).toContain(
      "role in ('student', 'assistant_coach', 'coach')"
    );
    expect(migration).not.toContain("new.role is distinct from 'school_admin'");
  });
});
