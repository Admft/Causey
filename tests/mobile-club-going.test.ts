import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { groupClubGoingRows } from "@/lib/data/portal";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("groupClubGoingRows", () => {
  it("groups RPC rows the same way getClubGoing does", () => {
    expect(
      groupClubGoingRows([
        { org_name: "Lincoln Chess", display_name: "Zoe" },
        { org_name: "Lincoln Chess", display_name: "Alex" },
        { org_name: "Northside", display_name: "" },
      ])
    ).toEqual([
      { org_name: "Lincoln Chess", names: ["Alex", "Zoe"] },
      { org_name: "Northside", names: ["Unnamed student"] },
    ]);
  });

  it("treats a missing payload as no groups", () => {
    expect(groupClubGoingRows(null)).toEqual([]);
    expect(groupClubGoingRows(undefined)).toEqual([]);
    expect(groupClubGoingRows([])).toEqual([]);
  });
});

describe("GET /api/mobile/club-going", () => {
  const route = read("app/api/mobile/club-going/route.ts");
  const website = read("lib/data/portal.ts");

  it("requires a signed-in allowed account and a competition uuid", () => {
    expect(route).toContain("export async function GET");
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("mobileAuthError");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain('status: 403');
    expect(route).toContain('z.string().uuid()');
    expect(route).toContain('searchParams.get("competitionId")');
  });

  it("calls get_club_going and returns website-shaped groups", () => {
    expect(route).toContain('rpc("get_club_going"');
    expect(route).toContain("p_competition_id");
    expect(route).toContain("groupClubGoingRows");
    expect(route).toContain("groups:");
    expect(website).toContain("export function groupClubGoingRows");
    expect(website).toContain("return groupClubGoingRows");
  });

  it("treats empty groups as success, including RPC failure", () => {
    expect(route).toContain("if (error)");
    expect(route).toContain("{ groups: [] }");
    expect(route).not.toContain("status: 500");
    expect(route).not.toContain("status: 503");
  });
});

describe("ClubGoingCard", () => {
  const card = read("mobile/src/ClubGoingCard.tsx");

  it("takes a competitionId and stays quiet without a session", () => {
    expect(card).toContain(
      "export function ClubGoingCard({ competitionId }: { competitionId: string })"
    );
    expect(card).toContain("useAuth");
    expect(card).toContain("if (!session) return null");
    expect(card).not.toContain("Sign in");
    expect(card).not.toContain("/login");
  });

  it("fetches grouped names and only renders when someone is going", () => {
    expect(card).toContain("/api/mobile/club-going?competitionId=");
    expect(card).toContain("Going from your club or school");
    expect(card).toContain("group.org_name");
    expect(card).toContain("group.names.join");
    expect(card).toContain("if (!groups.length) return null");
    expect(card).toContain("<Card>");
  });

  it("fails quietly instead of crashing the event screen", () => {
    expect(card).toContain(".catch(");
    expect(card).toContain("setGroups([])");
    expect(card).not.toContain("ErrorText");
    expect(card).not.toContain("throw ");
  });

  it("is mounted on the tournament screen with the listing id", () => {
    const event = read("mobile/app/event/[slug].tsx");
    expect(event).toContain("ClubGoingCard");
    expect(event).toContain("competitionId={event.id}");
  });
});
