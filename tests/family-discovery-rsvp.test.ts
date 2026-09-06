import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  allowsFamilyDiscoveryRsvp,
  buildEventRsvpTargets,
  organizerRegistrationProfileIds,
} from "@/lib/event-rsvp-targets";
import {
  pendingInvitesForChild,
  serializeFamilyDesk,
} from "@/lib/data/mobile-family";

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
    expect(source("lib/rsvp-write.ts")).toContain("performClearRsvp");
    expect(source("lib/rsvp.ts")).toContain("clearRsvpMode");
    expect(migrations).toContain("0082_clear_family_rsvp.sql");
    const clearSql = source("supabase/migrations/0082_clear_family_rsvp.sql");
    expect(clearSql).toContain("entrants_delete_own_family_rsvp");
    expect(clearSql).toContain("new.status = 'invited'");
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
    expect(source("app/family/page.tsx")).toContain("Waiting on a student");
    expect(source("app/event/[slug]/page.tsx")).toContain("InviteStudentButton");
    expect(source("components/InviteStudentButton.tsx")).toContain(
      "They accept on Plan"
    );
    expect(source("components/RsvpButtons.tsx")).toContain("Clear answer");
    expect(source("components/RsvpButtons.tsx")).toContain("clearRsvp");
  });

  it("keeps a parent invite off Family action lists until the student answers", () => {
    const outgoing = [
      {
        to_profile_id: "child-1",
        competition_id: "c-rec",
        competition: {
          slug: "spring-open",
          name: "Spring Open",
          city: "Austin",
          state: "TX",
          start_date: "2099-05-01",
          end_date: "2099-05-01",
        },
      },
    ];
    expect(
      pendingInvitesForChild(
        { profile_id: "child-1", upcoming: [] },
        outgoing,
        "2026-09-06"
      )
    ).toHaveLength(1);
    expect(
      pendingInvitesForChild(
        {
          profile_id: "child-1",
          upcoming: [{ competition_id: "c-rec" }],
        },
        outgoing,
        "2026-09-06"
      )
    ).toHaveLength(0);
    const desk = serializeFamilyDesk(
      [
        {
          profile_id: "child-1",
          display_name: "Jordan",
          orgs: [],
          entrants: [],
        },
      ],
      "2026-09-06",
      outgoing
    );
    expect(desk[0]?.pending_invites).toEqual([
      expect.objectContaining({
        competition_id: "c-rec",
        status: "pending_invite",
      }),
    ]);
  });

  it("keeps Family organizer actions on one row when titles are long", () => {
    const actions = source("components/FamilyRegistrationActions.tsx");
    const family = source("app/family/page.tsx");
    expect(actions).toContain("sm:flex-nowrap");
    expect(actions).toContain("whitespace-nowrap");
    expect(actions).toContain("shrink-0");
    expect(actions).not.toContain("flex-wrap");
    expect(family).toContain("min-w-0 flex-1");
    expect(family).toContain("sm:items-start sm:justify-between sm:gap-4");
  });
});
