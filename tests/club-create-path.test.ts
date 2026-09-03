import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COACH_SELF_SERVE_ORG_TYPES } from "@/lib/auth/orgs";
import { invitationRoleFitsOrganization } from "@/lib/invitations/claim-path";
import {
  CREATE_CLUB_LABEL,
  START_A_CLUB_LABEL,
  START_CLUB_SIGNUP_HREF,
  staffOrgListChromeFromTypes,
} from "@/lib/portal-copy";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("club-native create path", () => {
  it("keeps three person account types and sends club signup to create club", () => {
    expect(START_CLUB_SIGNUP_HREF).toBe("/signup?role=coach&next=/orgs/new");
    expect(START_A_CLUB_LABEL).toBe("Start a club");
    expect(CREATE_CLUB_LABEL).toBe("Create a club");
    expect(read("app/clubs/page.tsx")).toContain("START_CLUB_SIGNUP_HREF");
    expect(read("app/signup/page.tsx")).toContain(
      "Create a coach account to start a club"
    );
    expect(read("app/signup/page.tsx")).toContain("not a fourth club login");
    expect(read("lib/auth/types.ts")).toContain(
      'z.enum(["student", "coach", "parent"])'
    );
  });

  it("lets coaches create only club or team, not school", () => {
    expect(COACH_SELF_SERVE_ORG_TYPES.map((option) => option.value)).toEqual([
      "club",
      "team",
    ]);
    expect(read("components/OrgCreateForm.tsx")).toContain(
      "COACH_SELF_SERVE_ORG_TYPES"
    );
    expect(read("components/OrgCreateForm.tsx")).toContain("Create club");
    expect(read("app/orgs/new/page.tsx")).toContain("Create a club or team");
    expect(read("app/orgs/new/page.tsx")).not.toContain("Start an organization");
    expect(read("lib/actions/orgs.ts")).toContain('z.enum(["club", "team"])');
    expect(read("lib/actions/orgs.ts")).not.toContain(
      'z.enum(["school", "club", "team"])'
    );
  });

  it("names an empty coach workspace as clubs", () => {
    const empty = staffOrgListChromeFromTypes([]);
    expect(empty.heading).toBe("Your clubs");
    expect(empty.createCta).toBe(START_A_CLUB_LABEL);
    expect(staffOrgListChromeFromTypes(["district"]).heading).toBe(
      "Districts and schools"
    );
    expect(read("app/orgs/page.tsx")).toContain("staffOrgListChromeFromTypes");
    expect(read("app/orgs/page.tsx")).not.toContain("Start an organization");
  });

  it("hides School administrator on club and team staff invites", () => {
    expect(invitationRoleFitsOrganization("club", "school_admin")).toBe(false);
    expect(invitationRoleFitsOrganization("club", "coach")).toBe(true);
    expect(
      read("components/OrganizationPeopleManager.tsx")
    ).toContain("invitationRoleFitsOrganization");
    expect(read("app/orgs/[slug]/people/page.tsx")).toContain("Club staffing");
  });
});
