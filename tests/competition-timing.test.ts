import { describe, expect, it } from "vitest";
import {
  effectiveEndDate,
  isCompetitionEnded,
  isPastRetention,
  matchesTimingFilter,
  retentionCutoffDate,
} from "../lib/competition-timing";

describe("competition timing", () => {
  it("uses start_date when end_date is null", () => {
    expect(effectiveEndDate({ start_date: "2026-03-01", end_date: null })).toBe(
      "2026-03-01"
    );
  });

  it("marks past events as ended", () => {
    expect(
      isCompetitionEnded({ start_date: "2025-01-01", end_date: "2025-01-03" }, "2026-07-27")
    ).toBe(true);
    expect(
      isCompetitionEnded({ start_date: "2026-08-01", end_date: null }, "2026-07-27")
    ).toBe(false);
  });

  it("defaults search timing to upcoming", () => {
    const past = { start_date: "2025-01-01", end_date: null };
    const future = { start_date: "2027-01-01", end_date: null };
    expect(matchesTimingFilter(past, undefined, "2026-07-27")).toBe(false);
    expect(matchesTimingFilter(future, undefined, "2026-07-27")).toBe(true);
    expect(matchesTimingFilter(past, "ended", "2026-07-27")).toBe(true);
    expect(matchesTimingFilter(past, "all", "2026-07-27")).toBe(true);
  });

  it("retention cutoff is one year before asOf", () => {
    expect(retentionCutoffDate("2026-07-27")).toBe("2025-07-27");
    expect(
      isPastRetention({ start_date: "2025-07-26", end_date: null }, "2026-07-27")
    ).toBe(true);
    expect(
      isPastRetention({ start_date: "2025-07-27", end_date: null }, "2026-07-27")
    ).toBe(false);
  });
});
