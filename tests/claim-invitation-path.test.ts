import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accountRoleForOrgInvitationRole,
  buildClaimPath,
  extractClaimToken,
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
    const loginPage = readFileSync(
      resolve(process.cwd(), "app/login/page.tsx"),
      "utf8"
    );

    expect(inviteActions).toContain("buildClaimPath(row.claim_token)");
    expect(inviteActions).toContain("reissueOrganizationInvitation");
    expect(inviteActions).toContain("claims: BulkInviteClaimRow[]");
    expect(peopleManager).toContain("Reissue & copy link");
    expect(peopleManager).toContain("Download CSV");
    expect(peopleManager).toContain("Copy all claim links");
    expect(loginPage).toContain("getOrganizationInvitationPreview");
    expect(loginPage).toContain("Create staff account");
  });
});
