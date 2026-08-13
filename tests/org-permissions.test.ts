import { describe, expect, it } from "vitest";
import {
  canCreateOrg,
  canCreateTournament,
  canRsvpFor,
  isActiveMember,
  isDistrictAdmin,
  isOrgAdmin,
  isOrgCoach,
  isOrgStaff,
} from "@/lib/org-permissions";

const coachProfile = { id: "coach-1", role: "coach" as const, role_unlocked: true };
const org = { owner_profile_id: "coach-1" };

describe("isActiveMember", () => {
  it("only active memberships count", () => {
    expect(isActiveMember({ status: "active" })).toBe(true);
    expect(isActiveMember({ status: "invited" })).toBe(false);
    expect(isActiveMember({ status: "removed" })).toBe(false);
    expect(isActiveMember(null)).toBe(false);
  });
});

describe("isOrgCoach", () => {
  it("the org owner is staff even without a membership row", () => {
    expect(isOrgCoach(org, null, "coach-1")).toBe(true);
  });

  it("creator provenance does not preserve authority after transfer", () => {
    expect(
      isOrgCoach(
        { owner_profile_id: "new-owner" },
        null,
        "coach-1"
      )
    ).toBe(false);
  });

  it("active coach/admin members qualify", () => {
    expect(isOrgCoach(org, { role: "coach", status: "active" }, "other")).toBe(true);
    expect(isOrgCoach(org, { role: "admin", status: "active" }, "other")).toBe(true);
  });

  it("assistants, students, and removed coaches do not get operator authority", () => {
    expect(
      isOrgCoach(
        org,
        { role: "assistant_coach", status: "active" },
        "other"
      )
    ).toBe(false);
    expect(isOrgCoach(org, { role: "student", status: "active" }, "other")).toBe(false);
    expect(isOrgCoach(org, { role: "coach", status: "removed" }, "other")).toBe(false);
    expect(isOrgCoach(org, null, "other")).toBe(false);
  });
});

describe("isOrgStaff", () => {
  it("keeps assistant coaches in the scoped staff workspace", () => {
    expect(
      isOrgStaff(
        org,
        { role: "assistant_coach", status: "active" },
        "other"
      )
    ).toBe(true);
  });
});

describe("canCreateOrg", () => {
  it("requires an unlocked coach", () => {
    expect(canCreateOrg(coachProfile)).toBe(true);
    expect(canCreateOrg({ role: "coach", role_unlocked: false })).toBe(false);
    expect(canCreateOrg({ role: "student", role_unlocked: true })).toBe(false);
    expect(canCreateOrg({ role: "parent", role_unlocked: true })).toBe(false);
    expect(canCreateOrg(null)).toBe(false);
  });
});

describe("canCreateTournament", () => {
  it("uses scoped staff membership without rewriting the account persona", () => {
    expect(canCreateTournament(coachProfile, org, null)).toBe(true);
    expect(
      canCreateTournament(
        { id: "other", role: "coach", role_unlocked: true },
        org,
        { role: "coach", status: "active" }
      )
    ).toBe(true);
    expect(
      canCreateTournament(
        { id: "parent-staff", role: "parent", role_unlocked: true },
        org,
        { role: "school_admin", status: "active" }
      )
    ).toBe(true);
    expect(
      canCreateTournament(
        { id: "assistant", role: "coach", role_unlocked: true },
        org,
        { role: "assistant_coach", status: "active" }
      )
    ).toBe(false);
    expect(
      canCreateTournament(
        { id: "other", role: "coach", role_unlocked: true },
        org,
        { role: "student", status: "active" }
      )
    ).toBe(false);
    expect(
      canCreateTournament(
        { id: "student-1", role: "student", role_unlocked: true },
        org,
        { role: "student", status: "active" }
      )
    ).toBe(false);
  });
});

describe("isOrgAdmin", () => {
  it("keeps coaches and assistants out of administration gates", () => {
    expect(isOrgAdmin(org, null, "coach-1")).toBe(true);
    expect(
      isOrgAdmin(org, { role: "school_admin", status: "active" }, "other")
    ).toBe(true);
    expect(
      isOrgAdmin(org, { role: "district_admin", status: "active" }, "other")
    ).toBe(true);
    expect(isOrgAdmin(org, { role: "coach", status: "active" }, "other")).toBe(
      false
    );
    expect(
      isOrgAdmin(org, { role: "assistant_coach", status: "active" }, "other")
    ).toBe(false);
  });
});

describe("isDistrictAdmin", () => {
  it("requires a district organization and district_admin membership", () => {
    expect(
      isDistrictAdmin(
        { type: "district", owner_profile_id: "owner-1" },
        null,
        "owner-1"
      )
    ).toBe(true);
    expect(
      isDistrictAdmin(
        { type: "district", owner_profile_id: "owner-1" },
        { role: "district_admin", status: "active" },
        "other"
      )
    ).toBe(true);
    expect(
      isDistrictAdmin(
        { type: "school", owner_profile_id: "owner-1" },
        { role: "district_admin", status: "active" },
        "other"
      )
    ).toBe(false);
    expect(
      isDistrictAdmin(
        { type: "district", owner_profile_id: "owner-1" },
        { role: "school_admin", status: "active" },
        "other"
      )
    ).toBe(false);
  });
});

describe("canRsvpFor", () => {
  it("self and actively linked children only", () => {
    expect(canRsvpFor("me", "me", [])).toBe(true);
    expect(canRsvpFor("parent", "child", ["child"])).toBe(true);
    expect(canRsvpFor("parent", "stranger", ["child"])).toBe(false);
  });
});
