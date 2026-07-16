import { describe, expect, it } from "vitest";
import { eventFingerprint, normalizeEventName } from "../ingestion/fingerprint";
import { matchSeriesId } from "../ingestion/series-match";

describe("eventFingerprint", () => {
  it("collapses TLA vs CCA naming noise for the same event", () => {
    const tla = eventFingerprint({
      name: "World Open Chess Tournament",
      start_date: "2026-07-01",
      state: "PA",
      zip: "19103",
    });
    const cca = eventFingerprint({
      name: "The World Open",
      start_date: "2026-07-01",
      state: "pa",
      zip: "19103",
    });
    expect(tla).toBe(cca);
  });

  it("treats different dates as different events", () => {
    const a = eventFingerprint({
      name: "World Open",
      start_date: "2026-07-01",
      state: "PA",
    });
    const b = eventFingerprint({
      name: "World Open",
      start_date: "2027-07-01",
      state: "PA",
    });
    expect(a).not.toBe(b);
  });

  it("omits review-sentinel zip from the fingerprint", () => {
    const withSentinel = eventFingerprint({
      name: "Dallas Open",
      start_date: "2026-08-01",
      state: "TX",
      zip: "00000",
    });
    const without = eventFingerprint({
      name: "Dallas Open",
      start_date: "2026-08-01",
      state: "TX",
    });
    expect(withSentinel).toBe(without);
    expect(normalizeEventName("The Dallas Open Chess Tournament")).toContain("dallas");
  });
});

describe("matchSeriesId", () => {
  it("maps Texas Scholastic by name + state", () => {
    const hit = matchSeriesId("2026 Texas Scholastic Championship", "TX");
    expect(hit?.seriesId).toBe("00000000-0000-4000-8000-000000000106");
  });

  it("does not map Texas Scholastic in the wrong state", () => {
    expect(matchSeriesId("2026 Texas Scholastic Championship", "OK")).toBeNull();
  });

  it("maps Denker regardless of state", () => {
    const hit = matchSeriesId("Denker Tournament of High School Champions", "FL");
    expect(hit?.label).toMatch(/Denker/);
  });

  it("leaves ordinary opens unattached", () => {
    expect(matchSeriesId("Irving Swiss", "TX")).toBeNull();
  });
});
