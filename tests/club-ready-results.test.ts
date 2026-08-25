import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatRecordedResult } from "@/lib/format";
import { SearchFiltersSchema } from "@/lib/schemas";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("club-ready results and history", () => {
  it("names the next action on manage and links roster names to history", () => {
    const manage = source("app/event/[slug]/manage/page.tsx");
    const roster = source("app/orgs/[slug]/roster/page.tsx");
    const history = source(
      "app/orgs/[slug]/roster/[profileId]/page.tsx"
    );
    const entrants = source("components/EntrantManager.tsx");

    expect(manage).toContain("Record a result");
    expect(manage).toContain("ResultForm");
    expect(entrants).toContain("recordEntrantResult");
    expect(entrants).toContain("Result not recorded");
    expect(roster).toContain("/orgs/${org.slug}/roster/${row.profile_id}");
    expect(history).toContain("Record a result");
    expect(history).toContain("result not recorded");
  });

  it("shows recorded place/award on Plan and Family without treating blanks as losses", () => {
    const me = source("app/me/page.tsx");
    const family = source("app/family/page.tsx");
    expect(me).toContain("formatRecordedResult");
    expect(me).toContain("result not recorded");
    expect(family).toContain("formatRecordedResult");
    expect(family).toContain("result not recorded");
    expect(formatRecordedResult({ placement: 2, awardLabel: "VASE gold" })).toBe(
      "2nd place · VASE gold"
    );
    expect(formatRecordedResult({})).toBeNull();
  });

  it("filters signed-in search to events a club marked as attending", () => {
    expect(SearchFiltersSchema.parse({ club_going: "1" }).club_going).toBe(
      true
    );
    expect(source("components/SearchFilters.tsx")).toContain(
      "My club is going"
    );
    expect(source("lib/data/supabase.ts")).toContain(
      "clubGoingCompetitionIds"
    );
    expect(source("lib/data/mock.ts")).not.toContain("club_going");
  });

  it("extends season reports beyond hosted-only rows", () => {
    const reports = source("app/orgs/[slug]/reports/page.tsx");
    const season = source("lib/data/district.ts");
    expect(season).toContain('rpc("get_org_season_attendance"');
    expect(reports).toContain("marked as attending");
    expect(reports).toContain("Download attendance CSV");
    expect(reports).toContain("Club reporting");
    expect(reports).toContain("Team reporting");
  });

  it("asks the club owner to record results after attendance", () => {
    const overview = source("app/orgs/[slug]/page.tsx");
    const competitions = source("app/orgs/[slug]/competitions/page.tsx");
    expect(overview).toContain("getOrgSeasonAttendance");
    expect(overview).toContain("Record a result");
    expect(overview).toContain("Open season report");
    expect(competitions).toContain("Club events");
    expect(competitions).toContain("Team events");
  });
});
