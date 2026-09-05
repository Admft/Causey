import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serializeMobileOrgs } from "@/app/api/mobile/orgs/route";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";
import type { MyOrgRow } from "@/lib/data/portal";
import type { Organization, OrgMemberRole } from "@/lib/auth/orgs";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

function orgRow(
  partial: Pick<Organization, "id" | "name" | "slug" | "type"> & {
    memberRole: OrgMemberRole | null;
    isCoach: boolean;
  }
): MyOrgRow {
  return {
    org: {
      id: partial.id,
      name: partial.name,
      slug: partial.slug,
      type: partial.type,
      state: null,
      created_by: null,
      owner_profile_id: null,
      parent_org_id: null,
      verification_status: "pending",
      verified_at: null,
      verified_by: null,
      join_code: null,
      join_code_rotated_at: null,
      website_url: null,
      meeting_note: null,
    },
    memberRole: partial.memberRole,
    isCoach: partial.isCoach,
  };
}

describe("GET /api/mobile/orgs", () => {
  const route = read("app/api/mobile/orgs/route.ts");

  it("requires a signed-in, unblocked account and lists that account's orgs", () => {
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain("{ status: 403 }");
    expect(route).toContain("getMyOrgs(auth.user.id, auth.supabase)");
    expect(route).toContain("canMarkOrganizationAttending");
    expect(route).not.toContain("export async function POST");
  });

  it("serializes name, type, role, coach flag, and roster access", () => {
    const orgs = serializeMobileOrgs([
      orgRow({
        id: "club-1",
        name: "Austin Chess Club",
        slug: "austin-chess",
        type: "club",
        memberRole: "student",
        isCoach: false,
      }),
      orgRow({
        id: "team-1",
        name: "Debate Travel Team",
        slug: "debate-travel",
        type: "team",
        memberRole: "coach",
        isCoach: true,
      }),
      orgRow({
        id: "school-1",
        name: "Lincoln High",
        slug: "lincoln-high",
        type: "school",
        memberRole: "school_admin",
        isCoach: true,
      }),
      orgRow({
        id: "district-1",
        name: "Metro ISD",
        slug: "metro-isd",
        type: "district",
        memberRole: "district_admin",
        isCoach: true,
      }),
    ]);

    expect(orgs).toEqual([
      {
        id: "club-1",
        name: "Austin Chess Club",
        slug: "austin-chess",
        type: "club",
        role: "student",
        isCoach: false,
        has_roster: true,
      },
      {
        id: "team-1",
        name: "Debate Travel Team",
        slug: "debate-travel",
        type: "team",
        role: "coach",
        isCoach: true,
        has_roster: true,
      },
      {
        id: "school-1",
        name: "Lincoln High",
        slug: "lincoln-high",
        type: "school",
        role: "school_admin",
        isCoach: true,
        has_roster: true,
      },
      {
        id: "district-1",
        name: "Metro ISD",
        slug: "metro-isd",
        type: "district",
        role: "district_admin",
        isCoach: true,
        has_roster: false,
      },
    ]);
    expect(canMarkOrganizationAttending({ type: "district" })).toBe(false);
  });
});

describe("phone organizations screen", () => {
  const screen = read("mobile/app/orgs.tsx");

  it("lists memberships with Club/Team vs School/District nouns", () => {
    expect(screen).toContain("<Title>Your organizations</Title>");
    expect(screen).toContain(
      "You are not on a roster yet. Ask a coach for a join code."
    );
    expect(screen).toContain("/api/mobile/orgs");
    expect(screen).toContain('if (type === "team") return "Team"');
    expect(screen).toContain('if (type === "school") return "School"');
    expect(screen).toContain('if (type === "district") return "District"');
    expect(screen).toContain('return "Club"');
    expect(screen).not.toContain('type === "club") return "School"');
  });

  it("lets coaches open a roster and keeps desk work off the phone", () => {
    expect(screen).toContain('label="Open roster"');
    expect(screen).toContain("org.has_roster && org.isCoach");
    expect(screen).toContain("`/roster/${org.id}`");
    expect(screen).not.toContain("/orgs/new");
    expect(screen).not.toContain("CSV");
    expect(screen).not.toContain("settings");
    expect(screen).not.toContain("Invite students");
    expect(screen).not.toContain("Create a club");
    expect(screen).not.toContain("Create an organization");
  });

  it("is reachable from the Me tab", () => {
    expect(read("mobile/app/_layout.tsx")).toContain('name="orgs"');
    expect(read("mobile/app/(tabs)/me.tsx")).toContain('router.push("/orgs")');
    expect(read("mobile/app/orgs.tsx")).toContain('router.push("/join")');
  });
});
