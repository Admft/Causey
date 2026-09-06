import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  allowsFamilyDiscoveryRsvp,
  buildEventRsvpTargets,
  organizerRegistrationProfileIds,
} from "@/lib/event-rsvp-targets";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("family discovery RSVP", () => {
  it("offers unanswered Going for linked children on public listings", () => {
    const targets = buildEventRsvpTargets({
      viewerId: "parent-1",
      viewerRole: "parent",
      children: [{ profile_id: "child-1", display_name: "Jordan" }],
      entrants: [],
      familyDiscovery: true,
      ended: false,
    });
    expect(targets).toEqual([
      {
        profileId: "child-1",
        label: "Jordan",
        status: "unanswered",
      },
    ]);
  });

  it("does not add a parent self RSVP, and keeps existing invite rows", () => {
    const targets = buildEventRsvpTargets({
      viewerId: "parent-1",
      viewerRole: "parent",
      children: [{ profile_id: "child-1", display_name: "Jordan" }],
      entrants: [{ profile_id: "child-1", status: "invited" }],
      familyDiscovery: true,
      ended: false,
    });
    expect(targets).toEqual([
      {
        profileId: "child-1",
        label: "Jordan",
        status: "invited",
      },
    ]);
  });

  it("lets a student mark Going on a public listing without a club invite", () => {
    expect(
      buildEventRsvpTargets({
        viewerId: "student-1",
        viewerRole: "student",
        children: [],
        entrants: [],
        familyDiscovery: true,
        ended: false,
      })
    ).toEqual([
      { profileId: "student-1", label: "You", status: "unanswered" },
    ]);
  });

  it("does not invent unanswered RSVPs on ended or invite-only listings", () => {
    expect(
      allowsFamilyDiscoveryRsvp({
        status: "published",
        visibility: "public",
        audience: "invite_only",
      })
    ).toBe(false);
    expect(
      buildEventRsvpTargets({
        viewerId: "parent-1",
        viewerRole: "parent",
        children: [{ profile_id: "child-1", display_name: "Jordan" }],
        entrants: [],
        familyDiscovery: false,
        ended: false,
      })
    ).toEqual([]);
    expect(
      buildEventRsvpTargets({
        viewerId: "parent-1",
        viewerRole: "parent",
        children: [{ profile_id: "child-1", display_name: "Jordan" }],
        entrants: [],
        familyDiscovery: true,
        ended: true,
      })
    ).toEqual([]);
  });

  it("tracks organizer registration for going children, not the parent account", () => {
    expect(
      organizerRegistrationProfileIds({
        viewerId: "parent-1",
        childIds: ["child-1"],
        entrants: [],
      })
    ).toEqual([]);
    expect(
      organizerRegistrationProfileIds({
        viewerId: "parent-1",
        childIds: ["child-1"],
        entrants: [{ profile_id: "child-1", status: "going" }],
      })
    ).toEqual(["child-1"]);
  });

  it("lets insert policies create family going rows on public listings", () => {
    const migrations = readdirSync(
      resolve(process.cwd(), "supabase/migrations")
    ).filter((file) => /^\d{4}_.+\.sql$/.test(file));
    expect(migrations).toContain("0080_family_discovery_rsvp.sql");
    const sql = source("supabase/migrations/0080_family_discovery_rsvp.sql");
    expect(sql).toContain("is_parent_of(auth.uid(), profile_id)");
    expect(sql).toContain("response_source = 'parent'");
    expect(sql).toContain("response_source = 'self'");
    expect(sql).toContain("c.audience = 'public'");
    expect(sql).toContain("can_invite_to_competition");
    expect(source("lib/rsvp-write.ts")).toContain(".insert(");
    expect(source("app/event/[slug]/page.tsx")).toContain(
      "buildEventRsvpTargets"
    );
    expect(source("app/event/[slug]/page.tsx")).toContain(
      "Save is only a bookmark for this account"
    );
    expect(source("app/event/[slug]/page.tsx")).toContain(
      'target.label === "You" && rsvpTargets.length === 1'
    );
    expect(source("app/family/page.tsx")).toContain(
      "They do not need to be in a club first"
    );
    expect(source("app/family/page.tsx")).not.toContain(
      "No upcoming tournament invites."
    );
  });
});
