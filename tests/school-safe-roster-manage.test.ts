import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("school-safe roster and manage composition", () => {
  it("keeps roster on invite → group → competitions, with progressive groups", () => {
    const roster = source("app/orgs/[slug]/roster/page.tsx");
    const groups = source("components/GroupManager.tsx");

    expect(roster).toContain("Create a group for invites");
    expect(roster).toContain("needsGroups");
    expect(roster).toContain("groupNamesByStudent");
    expect(roster).toContain("not in a group yet");
    expect(roster).toContain("Manage invites &amp; staff");
    expect(groups).toContain("Edit students");
    expect(groups).toContain("Add another group");
    expect(groups).toContain("aria-expanded");
    expect(groups).toContain("setEditingId");
    expect(groups).toContain("showCreate");
  });

  it("groups manage replies by status and demotes individual picks when groups exist", () => {
    const manage = source("app/event/[slug]/manage/page.tsx");
    const invite = source("components/EntrantManager.tsx");

    expect(manage).toContain("groupAttendanceByReplyStatus");
    expect(manage).toContain("orderedAttendanceReplySections");
    expect(manage).toContain("Needs a reply");
    expect(manage).toContain("Going / attendance");
    expect(invite).toContain("showIndividualPicks");
    expect(invite).toContain("Or pick specific students");
    expect(invite).toContain("Hide list");
  });

  it("keeps Family metadata free of club-only RSVP wording", () => {
    const family = source("app/family/page.tsx");
    expect(family).not.toMatch(/club RSVP/i);
    expect(family).not.toMatch(/tell the club/i);
    expect(family).not.toContain("Not in any club yet.");
  });
});
