import { describe, expect, it } from "vitest";
import {
  canCreateOrg,
  canCreateTournament,
  canRsvpFor,
  isActiveMember,
  isOrgCoach,
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

  it("students and removed coaches do not", () => {
    expect(isOrgCoach(org, { role: "student", status: "active" }, "other")).toBe(false);
    expect(isOrgCoach(org, { role: "coach", status: "removed" }, "other")).toBe(false);
    expect(isOrgCoach(org, null, "other")).toBe(false);
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
  it("requires being an unlocked coach AND a coach of the org", () => {
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

describe("canRsvpFor", () => {
  it("self and actively linked children only", () => {
    expect(canRsvpFor("me", "me", [])).toBe(true);
    expect(canRsvpFor("parent", "child", ["child"])).toBe(true);
    expect(canRsvpFor("parent", "stranger", ["child"])).toBe(false);
  });
});
