import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPEN_MY_CLUBS_LABEL,
  OPEN_MY_ORGANIZATIONS_LABEL,
  membershipHistoryEyebrow,
  organizationKindTitle,
  studentOrgChromeFromTypes,
} from "@/lib/portal-copy";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("school and family chrome honesty", () => {
  it("labels membership history by organization kind", () => {
    expect(organizationKindTitle("school")).toBe("School");
    expect(membershipHistoryEyebrow("school")).toBe("School record");
    expect(membershipHistoryEyebrow("club")).toBe("Club record");
    expect(membershipHistoryEyebrow("team")).toBe("Team record");
    expect(source("app/orgs/[slug]/roster/[profileId]/page.tsx")).toContain(
      "membershipHistoryEyebrow"
    );
    expect(source("app/orgs/[slug]/roster/[profileId]/page.tsx")).not.toContain(
      "Club record"
    );
    expect(source("app/orgs/[slug]/roster/[profileId]/page.tsx")).not.toContain(
      "club-attending"
    );
  });

  it("keeps Family free of club-only mission and membership empty copy", () => {
    const family = source("app/family/page.tsx");
    expect(family).toContain("studentOrgChromeFromTypes");
    expect(family).toContain("familyRsvpMission");
    expect(family).toContain("notYetMembership");
    expect(family).not.toMatch(/tell the club/i);
    expect(family).not.toContain("Not in any club yet.");
    expect(source("lib/data/portal.ts")).toContain(
      "organizations(id, name, slug, type)"
    );
  });

  it("derives Plan and Orgs student chrome from membership types", () => {
    const school = studentOrgChromeFromTypes(["school"]);
    expect(school.heading).toBe("Your schools");
    expect(school.openLabel).toBe("Open my schools");
    expect(school.notYetMembership).toBe("Not in a school yet.");
    expect(school.familyRsvpMission).toMatch(/tell the school/);

    const club = studentOrgChromeFromTypes(["club"]);
    expect(club.heading).toBe("Your clubs");
    expect(club.openLabel).toBe(OPEN_MY_CLUBS_LABEL);
    expect(club.familyRsvpMission).toMatch(/tell the club/);

    const empty = studentOrgChromeFromTypes([]);
    expect(empty.heading).toBe("Your organizations");
    expect(empty.openLabel).toBe(OPEN_MY_ORGANIZATIONS_LABEL);
    expect(empty.notYetMembership).toBe("Not in a school or club yet.");
    expect(empty.familyRsvpMission).toMatch(/school or club/);

    const mixed = studentOrgChromeFromTypes(["school", "team"]);
    expect(mixed.heading).toBe("Your organizations");
    expect(mixed.openLabel).toBe(OPEN_MY_ORGANIZATIONS_LABEL);

    const me = source("app/me/page.tsx");
    const orgs = source("app/orgs/page.tsx");
    expect(me).toContain("studentOrgChromeFromTypes");
    expect(me).not.toContain("Club RSVP tells");
    expect(me).toContain('label: "Open my organizations"');
    expect(me).not.toContain('label: "Join a club"');
    expect(orgs).toContain("studentOrgChromeFromTypes");
    expect(orgs).toContain("staffOrgListChromeFromTypes");
    expect(orgs).not.toContain("You left that club.");
    expect(orgs).toContain("studentChrome.heading");
  });
});
