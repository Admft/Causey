import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile team past events", () => {
  it("returns past_events alongside upcoming events", () => {
    const source = read("lib/data/mobile-team.ts");
    expect(source).toContain("past_events: MobileTeamEvent[]");
    expect(source).toContain("past_events: []");
    expect(source).toContain("PAST_WINDOW_DAYS = 90");
    expect(source).toContain("PAST_LIMIT = 20");
    expect(source).toContain("isUpcomingEvent");
    expect(read("app/api/mobile/team/route.ts")).toContain("...team");
  });

  it("renders Recent events on the coach team tab", () => {
    const team = read("mobile/app/(tabs)/team.tsx");
    expect(team).toContain("Recent events");
    expect(team).toContain("past_events");
    expect(team).toContain("`/attendance/${event.competition_id}`");
    expect(team).toContain("CSV");
    expect(team).toContain("settings");
    expect(team).toContain("reports");
  });
});
