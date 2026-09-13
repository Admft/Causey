import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accountOrganizationsEmptyCta,
  offersClubSelfServe,
  staffAccountPersonaLabel,
} from "@/lib/portal-copy";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("staff account branding after claim", () => {
  it("labels claimed organization administrators by their exact authority", () => {
    expect(
      staffAccountPersonaLabel({
        role: "coach",
        memberRoles: ["school_admin"],
        orgTypes: ["school"],
      })
    ).toBe("School administrator");
    expect(
      staffAccountPersonaLabel({
        role: "coach",
        memberRoles: ["district_admin"],
        orgTypes: ["district"],
      })
    ).toBe("District administrator");
    expect(
      staffAccountPersonaLabel({
        role: "coach",
        memberRoles: ["coach"],
        orgTypes: ["school"],
      })
    ).toBe("Coach");
    expect(
      staffAccountPersonaLabel({
        role: "coach",
        memberRoles: ["coach"],
        orgTypes: ["club"],
      })
    ).toBe("Coach");
    expect(staffAccountPersonaLabel({ role: "student" })).toBe("Student");
  });

  it("hides club self-serve for school and district-only staff", () => {
    expect(offersClubSelfServe([])).toBe(true);
    expect(offersClubSelfServe(["club"])).toBe(true);
    expect(offersClubSelfServe(["school"])).toBe(false);
    expect(offersClubSelfServe(["district"])).toBe(false);
    expect(offersClubSelfServe(["school", "club"])).toBe(true);
  });

  it("sends school staff Account empty CTA to schools, not Create a club", () => {
    expect(
      accountOrganizationsEmptyCta({
        role: "coach",
        canCreate: true,
        hasSchoolAccess: true,
      })
    ).toEqual({ href: "/orgs", label: "Open my schools" });
  });

  it("wires Account and Orgs to staff persona helpers", () => {
    const account = source("app/account/page.tsx");
    const orgs = source("app/orgs/page.tsx");
    expect(account).toContain("staffAccountPersonaLabel");
    expect(account).not.toContain('coach: "Coach / Organizer"');
    expect(orgs).toContain("offersClubSelfServe");
    expect(orgs).toContain("ORG_ROLE_LABELS");
    expect(orgs).toContain('title: "Your organizations"');
    expect(orgs).not.toContain('title: "Your clubs"');
    expect(source("components/AdminUserDirectory.tsx")).toContain(
      "staffAccountPersonaLabel"
    );
  });
});
