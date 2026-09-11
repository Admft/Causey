import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPEN_MY_CLUBS_LABEL,
  OPEN_MY_ORGANIZATIONS_LABEL,
  staffPlanMissionFromTypes,
} from "@/lib/portal-copy";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("coach Plan mission school/district nouns", () => {
  it("derives Plan mission copy from staff membership types", () => {
    expect(staffPlanMissionFromTypes(["district"])).toEqual({
      title: "Run your next district task",
      description:
        "Open your district workspace to manage schools, competitions, and reports.",
      href: "/orgs",
      label: "Open Districts & schools",
    });

    expect(staffPlanMissionFromTypes(["school"])).toEqual({
      title: "Run your next school task",
      description:
        "Open your school workspace to manage rosters, invitations, and competitions.",
      href: "/orgs",
      label: "Open my schools",
    });

    expect(staffPlanMissionFromTypes(["school", "club"])).toEqual({
      title: "Run your next organization task",
      description:
        "Open your workspace to manage rosters, invitations, and competitions.",
      href: "/orgs",
      label: OPEN_MY_ORGANIZATIONS_LABEL,
    });

    expect(staffPlanMissionFromTypes(["club"])).toEqual({
      title: "Run your next club task",
      description:
        "Open your club workspace to manage rosters, invitations, and competitions.",
      href: "/orgs",
      label: OPEN_MY_CLUBS_LABEL,
    });

    expect(staffPlanMissionFromTypes([])).toEqual({
      title: "Run your next club task",
      description:
        "Open your club workspace to manage rosters, invitations, and competitions.",
      href: "/orgs",
      label: OPEN_MY_CLUBS_LABEL,
    });
  });

  it("wires Plan to load coach memberships and use staffPlanMissionFromTypes", () => {
    const me = source("app/me/page.tsx");
    expect(me).toContain("staffPlanMissionFromTypes");
    expect(me).toContain('profile.role === "coach"');
    expect(me).toContain('profile.role === "student" || profile.role === "coach"');
    expect(me).not.toContain('title: "Run your next club task"');
    expect(me).not.toContain('label: "Open my clubs"');
  });
});
