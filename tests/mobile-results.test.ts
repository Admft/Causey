import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthedSupabase } from "@/lib/supabase/authed";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const mocks = vi.hoisted(() => ({
  createInAppNotifications: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions/in-app-notifications", () => ({
  createInAppNotifications: mocks.createInAppNotifications,
}));

function sliceExport(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf("export async function", start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

describe("mobile results write path", () => {
  const competitionId = "11111111-1111-4111-8111-111111111111";
  const profileId = "22222222-2222-4222-8222-222222222222";
  const parentId = "33333333-3333-4333-8333-333333333333";
  const userId = "44444444-4444-4444-8444-444444444444";
  const sectionId = "55555555-5555-4555-8555-555555555555";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createInAppNotifications.mockResolvedValue({
      requested: 2,
      created: 2,
      failures: [],
    });
  });

  it("shares one permission and notification path with the website", () => {
    const shared = read("lib/results-write.ts");
    expect(shared).toContain("can_manage_competition");
    expect(shared).toContain("can_invite_to_competition");
    expect(shared).toContain("Only competition staff can record a result.");
    expect(shared).toContain("result_marked_by");
    expect(shared).toContain("result_marked_at");
    expect(shared).toContain("get_active_guardians_for_profiles");
    expect(shared).toContain("p_child_ids");
    expect(shared).toContain("{ client: input.supabase }");
    expect(shared).not.toContain("getActiveGuardiansForProfiles");
    expect(shared).not.toContain("getSessionUser");

    const website = sliceExport(
      read("lib/actions/district.ts"),
      "recordEntrantResult"
    );
    expect(website).toContain("performRecordResult");
    expect(website).toContain("revalidatePath");
    expect(website).not.toContain("getActiveGuardiansForProfiles");
    expect(website).not.toContain("createInAppNotifications");

    expect(read("app/api/mobile/results/route.ts")).toContain(
      "performRecordResult"
    );
  });

  it("loads guardians on the passed client instead of a cookie session", async () => {
    const { performRecordResult } = await import("@/lib/results-write");
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_manage_competition") {
        return { data: true, error: null };
      }
      if (name === "can_invite_to_competition") {
        return { data: false, error: null };
      }
      if (name === "get_active_guardians_for_profiles") {
        return {
          data: [
            {
              child_id: profileId,
              parent_id: parentId,
              child_display_name: "Alex",
            },
          ],
          error: null,
        };
      }
      throw new Error(name);
    });
    const entrants = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    entrants.update.mockReturnValue(entrants);
    entrants.eq.mockReturnValueOnce(entrants).mockResolvedValueOnce({
      count: 1,
      error: null,
    });
    const competitions = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { name: "Spring Open" },
        error: null,
      }),
    };
    competitions.select.mockReturnValue(competitions);
    competitions.eq.mockReturnValue(competitions);
    const supabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "competition_entrants") return entrants;
        if (table === "competitions") return competitions;
        throw new Error(table);
      }),
    } as unknown as AuthedSupabase;

    const result = await performRecordResult({
      supabase,
      userId,
      competitionId,
      profileId,
      eventSlug: "spring-open",
      sectionId,
      placement: 2,
      awardLabel: "  Board prize  ",
    });

    expect(result).toEqual({ ok: true });
    expect(entrants.update).toHaveBeenCalledWith(
      expect.objectContaining({
        section_id: sectionId,
        placement: 2,
        award_label: "Board prize",
        result_marked_by: userId,
      }),
      { count: "exact" }
    );
    expect(rpc).toHaveBeenCalledWith("get_active_guardians_for_profiles", {
      p_child_ids: [profileId],
    });
    expect(mocks.createInAppNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          recipientId: profileId,
          kind: "result",
          title: "Result recorded: Spring Open",
          body: "Place 2 · Board prize is now on Causey.",
          href: "/event/spring-open",
        }),
        expect.objectContaining({
          recipientId: parentId,
          kind: "result",
          title: "Alex · Result recorded: Spring Open",
          href: "/family",
        }),
      ],
      { client: supabase }
    );
  });

  it("skips parent alerts when clearing a result", async () => {
    const { performRecordResult } = await import("@/lib/results-write");
    const rpc = vi.fn(async (name: string) => {
      if (
        name === "can_manage_competition" ||
        name === "can_invite_to_competition"
      ) {
        return { data: true, error: null };
      }
      throw new Error(name);
    });
    const entrants = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    entrants.update.mockReturnValue(entrants);
    entrants.eq.mockReturnValueOnce(entrants).mockResolvedValueOnce({
      count: 1,
      error: null,
    });
    const supabase = {
      rpc,
      from: vi.fn(() => entrants),
    } as unknown as AuthedSupabase;

    const result = await performRecordResult({
      supabase,
      userId,
      competitionId,
      profileId,
      eventSlug: "spring-open",
      sectionId: null,
      placement: null,
      awardLabel: "   ",
    });

    expect(result).toEqual({ ok: true });
    expect(entrants.update).toHaveBeenCalledWith(
      expect.objectContaining({
        section_id: null,
        placement: null,
        award_label: null,
        result_marked_by: null,
        result_marked_at: null,
      }),
      { count: "exact" }
    );
    expect(rpc).not.toHaveBeenCalledWith(
      "get_active_guardians_for_profiles",
      expect.anything()
    );
    expect(mocks.createInAppNotifications).not.toHaveBeenCalled();
  });
});

describe("mobile results API and screen", () => {
  it("lists every member and saves with website nullability", () => {
    const route = read("app/api/mobile/results/route.ts");
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("can_manage_competition");
    expect(route).toContain("getEventAttendance");
    expect(route).toContain('from("sections")');
    expect(route).toContain("section_id: row.section_id");
    expect(route).toContain("placement: row.placement");
    expect(route).toContain("award_label: row.award_label");
    expect(route).toContain('member_status !== "removed"');
    expect(route).not.toContain('status === "attended"');
    expect(route).toContain("z.number().int().min(1).max(999).nullable()");
    expect(route).toContain('z.string().trim().max(80).nullable()');
    expect(route).toContain("Check the division, place, or award.");
    expect(route).not.toContain("getActiveGuardiansForProfiles");
  });

  it("records place and award per student without treating a blank as 0th", () => {
    const screen = read("mobile/app/results/[competitionId].tsx");
    expect(screen).toContain("<Screen header");
    expect(screen).toContain("Field");
    expect(screen).toContain("PrimaryButton");
    expect(screen).toContain("Card");
    expect(screen).toContain("ErrorText");
    expect(screen).toContain("/api/mobile/results");
    expect(screen).toContain("No place recorded");
    expect(screen).not.toContain("0th");
    expect(screen).toContain("keyboardType=\"number-pad\"");
    expect(screen).toContain("Save result");
  });

  it("is reachable from My team and attendance", () => {
    expect(read("mobile/app/_layout.tsx")).toContain(
      'name="results/[competitionId]"'
    );
    expect(read("mobile/app/attendance/[competitionId].tsx")).toContain(
      "`/results/${competitionId}`"
    );
    expect(read("mobile/app/attendance/[competitionId].tsx")).not.toContain(
      "Places and awards are recorded on the website after the event."
    );
    const team = read("mobile/app/(tabs)/team.tsx");
    expect(team).toContain("`/results/${event.competition_id}`");
    expect(team).toContain("Record results");
  });
});
