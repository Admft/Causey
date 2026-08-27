import { describe, expect, it } from "vitest";
import { eventFingerprint, normalizeEventName } from "../ingestion/fingerprint";
import { matchSeriesId } from "../ingestion/series-match";
import { recordSuccessfulNoopScrapeRun } from "../ingestion/scrape-run";

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

  it("keeps open/championship distinct (no false merges)", () => {
    const open = eventFingerprint({
      name: "Dallas Open",
      start_date: "2026-08-01",
      state: "TX",
      zip: "75201",
    });
    const champ = eventFingerprint({
      name: "Dallas Championship",
      start_date: "2026-08-01",
      state: "TX",
      zip: "75201",
    });
    expect(open).not.toBe(champ);
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

  it("does not false-match Barber shop or junior open qualifier", () => {
    expect(matchSeriesId("Local Barber Swiss", "NY")).toBeNull();
    expect(matchSeriesId("US Junior Open Qualifier", "CA")).toBeNull();
    expect(matchSeriesId("Illinois State Fair Chess", "IL")).toBeNull();
  });
});

describe("scrape run logging", () => {
  it("records an intentional zero-row cycle as a successful no-op", async () => {
    const inserted: unknown[] = [];
    const updated: unknown[] = [];
    const client = {
      from: () => ({
        insert: (row: unknown) => {
          inserted.push(row);
          return {
            select: () => ({
              single: async () => ({
                data: { id: "run-1" },
                error: null,
              }),
            }),
          };
        },
        update: (row: unknown) => {
          updated.push(row);
          return {
            eq: async () => ({ error: null }),
          };
        },
      }),
    };

    await recordSuccessfulNoopScrapeRun(
      client as never,
      "bennington_writers_scrape",
      { outcome: "no_complete_cycle" }
    );

    expect(inserted).toEqual([
      {
        source: "bennington_writers_scrape",
        status: "running",
        meta: { outcome: "no_complete_cycle" },
      },
    ]);
    expect(updated).toEqual([
      expect.objectContaining({
        status: "succeeded",
        rows_staged: 0,
        rows_upserted: 0,
        meta: {
          outcome: "no_complete_cycle",
          no_complete_cycle: true,
          existing_data_unchanged: true,
        },
      }),
    ]);
  });
});
