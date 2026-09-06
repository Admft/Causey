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
    expect(tokenPage).toContain("ClaimInvitationAuth");
    expect(codePage).toContain("ClaimInvitationAuth");
  });
});
