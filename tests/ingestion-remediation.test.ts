import { describe, expect, it } from "vitest";
import { duplicateLocationEvidence } from "@/ingestion/dedupe";
import { competitionExternalKey, type StagedCompetition } from "@/ingestion/persist";
import {
  configuredRetractionMode,
  retractStaleSourceListings,
} from "@/ingestion/stale-retraction";
import { escapePostgrestLikePattern } from "@/lib/data/supabase";
import { assertSeedSafety } from "@/scripts/seed-supabase";

describe("stable source identity", () => {
  it("prefers source-native ids and preserves legacy staged-file fallback", () => {
    expect(
      competitionExternalKey({
        external_key: "12345",
        slug: "mutable-title-2026",
        details: {},
      } as unknown as StagedCompetition)
    ).toBe("12345");
    expect(
      competitionExternalKey({
        slug: "legacy-slug",
        details: { chess_results_tnr: "9988" },
      } as unknown as StagedCompetition)
    ).toBe("9988");
    expect(
      competitionExternalKey({
        slug: "legacy-slug",
        details: {},
      } as unknown as StagedCompetition)
    ).toBe("legacy-slug");
  });
});

describe("dedupe confidence", () => {
  it("requires ZIP or strong location evidence", () => {
    const base = {
      zip: "00000",
      city: "Austin",
      address: null,
      lat: 0,
      lng: 0,
    };
    expect(duplicateLocationEvidence(base, base)).toBe("uncertain");
    expect(
      duplicateLocationEvidence(
        { ...base, zip: "78701" },
        { ...base, zip: "78701" }
      )
    ).toBe("zip");
    expect(
      duplicateLocationEvidence(
        { ...base, address: "100 Congress Ave" },
        { ...base, address: "100 Congress Avenue" }
      )
    ).toBe("uncertain");
    expect(
      duplicateLocationEvidence(
        { ...base, lat: 30.2672, lng: -97.7431 },
        { ...base, lat: 30.268, lng: -97.742 }
      )
    ).toBe("coordinates");
  });
});

describe("stale retraction controls", () => {
  it("requires an explicit mode and never queries for partial snapshots", async () => {
    expect(configuredRetractionMode(undefined)).toBe("off");
    expect(() => configuredRetractionMode("1")).toThrow(/must be/);
    const result = await retractStaleSourceListings(
      {} as never,
      "tla_scrape",
      { completeSourceSnapshot: false, mode: "apply" }
    );
    expect(result.archived).toBe(0);
    expect(result.cutoff).toBeNull();
  });
});

describe("search escaping", () => {
  it("treats percent, underscore, and backslash literally", () => {
    expect(escapePostgrestLikePattern("100%_club\\open")).toBe(
      "100\\%\\_club\\\\open"
    );
  });
});

describe("seed safety", () => {
  const tagged = [{ notes: "SEED SCAFFOLDING — illustrative only" }];

  it("blocks production and untagged illustrative rules by default", () => {
    expect(() => assertSeedSafety({ NODE_ENV: "production" }, tagged)).toThrow(
      /production target/i
    );
    expect(() =>
      assertSeedSafety({} as NodeJS.ProcessEnv, [{ notes: "looks real" }])
    ).toThrow(
      /illustrative tag/i
    );
    expect(() =>
      assertSeedSafety(
        {
          NODE_ENV: "production",
          ALLOW_PRODUCTION_SEED: "1",
          ALLOW_ILLUSTRATIVE_SEED: "1",
        },
        tagged
      )
    ).not.toThrow();
  });
});
