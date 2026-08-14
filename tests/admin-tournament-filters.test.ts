import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  adminTournamentsHaveFilters,
  adminTournamentsHref,
  parseAdminTournamentFilters,
} from "@/lib/admin-tournament-filters";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("parseAdminTournamentFilters", () => {
  it("accepts type, timing, place, format, and audience together", () => {
    expect(
      parseAdminTournamentFilters({
        category: "debate",
        status: "draft",
        source: "uil_speech_debate",
        timing: "upcoming",
        q: "  invitational  ",
        state: "tx",
        mode: "in_person",
        audience: "public",
        ready: "1",
      })
    ).toEqual({
      category: "debate",
      status: "draft",
      source: "uil_speech_debate",
      timing: "upcoming",
      q: "invitational",
      state: "TX",
      mode: "in_person",
      audience: "public",
      ready: true,
    });
  });

  it("ignores invalid or empty values, including timing=all", () => {
    expect(
      parseAdminTournamentFilters({
        category: "chess-club",
        status: "live",
        timing: "all",
        state: "Texas",
        mode: "virtual",
        audience: "members",
        ready: "yes",
        q: "   ",
      })
    ).toEqual({});
  });
});

describe("adminTournamentsHref", () => {
  it("keeps other filters when switching status", () => {
    expect(
      adminTournamentsHref(
        parseAdminTournamentFilters({
          category: "arts",
          source: "uil_music_marching",
          timing: "ended",
        }),
        { status: "published" }
      )
    ).toBe(
      "/admin/tournaments?category=arts&status=published&source=uil_music_marching&timing=ended"
    );
  });

  it("clears to the unfiltered list", () => {
    expect(adminTournamentsHref()).toBe("/admin/tournaments");
    expect(adminTournamentsHaveFilters({})).toBe(false);
  });
});

describe("admin tournaments inventory", () => {
  it("exposes type plus the extra filters on the platform list", () => {
    const page = read("app/admin/tournaments/page.tsx");
    const query = read("lib/data/admin.ts");
    expect(page).toContain('name="category"');
    expect(page).toContain("All types");
    expect(page).toContain('name="timing"');
    expect(page).toContain('name="q"');
    expect(page).toContain('name="state"');
    expect(page).toContain('name="mode"');
    expect(page).toContain('name="audience"');
    expect(query).toContain('query.eq("category", filters.category)');
    expect(query).toContain('query.eq("participation_mode", filters.mode)');
    expect(query).toContain('query.eq("audience", filters.audience)');
  });
});
