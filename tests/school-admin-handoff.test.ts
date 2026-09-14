import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countSchoolAdministrators,
  schoolNeedsAdministratorInvite,
  viewerHoldsSchoolAdminSeat,
} from "@/lib/school-admin-handoff";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("school administrator invite mission", () => {
  it("treats a claimed school administrator as already holding the seat", () => {
    expect(
      viewerHoldsSchoolAdminSeat({
        role: "school_admin",
        status: "active",
      })
    ).toBe(true);
    expect(
      viewerHoldsSchoolAdminSeat({
        role: "school_admin",
        status: "invited",
      })
    ).toBe(true);
    expect(
      viewerHoldsSchoolAdminSeat({
        role: "coach",
        status: "active",
      })
    ).toBe(false);
    expect(viewerHoldsSchoolAdminSeat(null)).toBe(false);
  });

  it("counts a staff-directory admin even when org_id is missing", () => {
    expect(
      countSchoolAdministrators(
        [
          {
            member_role: "school_admin",
            member_status: "active",
          },
        ],
        "school-1"
      )
    ).toBe(1);
    expect(
      countSchoolAdministrators(
        [
          {
            org_id: "school-1",
            member_role: "school_admin",
            member_status: "invited",
          },
        ],
        "school-1"
      )
    ).toBe(1);
  });

  it("does not ask a sitting school administrator to invite themselves", () => {
    expect(
      schoolNeedsAdministratorInvite({
        orgType: "school",
        parentOrgId: "district-1",
        viewerIsSchoolAdmin: true,
        schoolAdminCount: 0,
        pendingSchoolAdminInvites: 0,
      })
    ).toBe(false);
    expect(
      schoolNeedsAdministratorInvite({
        orgType: "school",
        parentOrgId: "district-1",
        viewerIsSchoolAdmin: false,
        schoolAdminCount: 0,
        pendingSchoolAdminInvites: 0,
      })
    ).toBe(true);
    expect(
      schoolNeedsAdministratorInvite({
        orgType: "school",
        parentOrgId: "district-1",
        viewerIsSchoolAdmin: false,
        schoolAdminCount: null,
      })
    ).toBe(false);
  });

  it("keeps People and school overview off Delegate-this-school copy", () => {
    const peoplePage = read("app/orgs/[slug]/people/page.tsx");
    const overview = read("app/orgs/[slug]/page.tsx");
    expect(peoplePage).toContain("viewerHoldsSchoolAdminSeat");
    expect(peoplePage).toContain("schoolNeedsAdministratorInvite");
    expect(peoplePage).not.toContain("Delegate this school");
    expect(peoplePage).toContain("Invite a school administrator");
    expect(peoplePage).toContain('view.org.type === "school"');
    expect(peoplePage).toContain('? "coach"');
    expect(overview).toContain("viewerHoldsSchoolAdminSeat");
    expect(overview).not.toContain("Delegate this school");
    expect(overview).not.toContain("Ownership handoff is pending");
    expect(overview).toContain("Invite a school administrator");
    const settings = read("app/orgs/[slug]/settings/page.tsx");
    expect(settings).toContain("viewerHoldsSchoolAdminSeat");
  });
});
