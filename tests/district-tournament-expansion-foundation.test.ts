import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DISCOVERY_CATEGORIES,
  PUBLIC_DISCOVERY_CATEGORY_IDS,
  discoveryCategoryHref,
  parseDiscoveryCategory,
  preferredDiscoveryHref,
} from "@/lib/category-discovery";
import {
  INGESTION_SOURCES,
  assertSourceAutomationAllowed,
  evaluateSourceBatchHealth,
  evaluateSourceOperationalHealth,
  sourceByCompetitionSource,
  sourceNeedsOperationalAttention,
} from "@/lib/ingestion-sources";
import {
  COMPETITION_DETAILS_SCHEMA_VERSION,
  CompetitionSchema,
} from "@/lib/schemas";

function repositoryFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district tournament expansion foundation", () => {
  it("keeps one ordered public category routing contract", () => {
    expect(DISCOVERY_CATEGORIES.map((category) => category.id)).toEqual(
      PUBLIC_DISCOVERY_CATEGORY_IDS
    );
    expect(discoveryCategoryHref("stem", { zip: "75201" })).toBe(
      "/stem?zip=75201"
    );
    expect(preferredDiscoveryHref(null)).toBe("/");
    expect(parseDiscoveryCategory("other")).toBeNull();
  });

  it("adds a nullable, constrained shortcut without a chess signup fallback", () => {
    const sql = repositoryFile(
      "supabase/migrations/0056_profile_competition_category.sql"
    );
    expect(sql).toContain("preferred_competition_category text");
    expect(sql).toContain("alter column preferred_competition_category set default null");
    expect(sql).toContain("profiles_preferred_competition_category_check");
    expect(sql).toContain("preferred_competition_category in");
    expect(sql).toContain("preferred_competition_category,");
    expect(sql).toContain("grant update (");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("selected_interests text[] := array[]::text[]");
    expect(sql).not.toContain("else array['chess']");
  });

  it("lets callers omit category to search every public directory", () => {
    const route = repositoryFile("app/api/competitions/route.ts");
    expect(route).not.toContain('raw.category ??= "chess"');
    expect(route).not.toContain("Choose a competition type before searching.");
    expect(route).toContain("isDiscoveryCategory(parsed.data.category)");
    expect(route).toContain("Omit category to search every public directory");
  });

  it("versions category details and rejects cross-category pathways", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "stem-event",
      name: "STEM event",
      category: "stem",
      custom_category_name: null,
      participation_mode: "online",
      organizer_name: "Organizer",
      venue_name: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      lat: null,
      lng: null,
      start_date: "2027-01-01",
      end_date: null,
      reg_deadline: null,
      reg_url: null,
      entry_fee_cents: null,
      rated: false,
      rating_system: null,
      series_id: null,
      source: "organizer",
      source_url: null,
      image_url: null,
      pathway_status: "none",
      pathway_summary: null,
      pathway_related: [],
      visibility: "public",
      audience: "public",
      org_id: null,
      created_by: null,
      details: {
        schema_version: COMPETITION_DETAILS_SCHEMA_VERSION,
        facets: ["mathematics"],
      },
      interest_count: 0,
      status: "published",
    } as const;
    expect(CompetitionSchema.safeParse(base).success).toBe(true);
    expect(
      CompetitionSchema.safeParse({
        ...base,
        details: { schema_version: 1, facets: ["poetry"] },
      }).success
    ).toBe(false);
    expect(
      CompetitionSchema.safeParse({
        ...base,
        pathway_status: "known",
        pathway_summary: "Copied from chess",
      }).success
    ).toBe(false);
  });

  it("governs every source and records reviews for runnable discovery adapters", () => {
    for (const source of INGESTION_SOURCES) {
      expect(source.governance.owner).toBeTruthy();
      expect(source.governance.permissionBasis).toBeTruthy();
      expect(source.governance.automationState).toBeTruthy();
    }
    for (const source of INGESTION_SOURCES.filter(
      (entry) =>
        entry.category !== "chess" &&
        entry.governance.automationState === "enabled"
    )) {
      expect(source.governance.permissionReviewedOn, source.id).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
      expect(source.governance.expectedRows, source.id).not.toBeNull();
      expect(source.governance.killSwitchEnv, source.id).toMatch(
        /^SCRAPE_DISABLE_/
      );
    }
  });

  it("fails closed for paused, blocked, killed, and abnormal sources", () => {
    expect(() =>
      assertSourceAutomationAllowed("tabroom_scrape", {})
    ).toThrow(/paused/i);
    expect(() =>
      assertSourceAutomationAllowed("vex_events_scrape", {})
    ).toThrow(/blocked/i);
    expect(
      assertSourceAutomationAllowed("doe_science_bowl_scrape", {}).governance
        .automationState
    ).toBe("enabled");
    expect(() =>
      assertSourceAutomationAllowed("txsef_scrape", {
        SCRAPE_DISABLE_TXSEF_SCRAPE: "1",
      })
    ).toThrow(/disabled/i);
    expect(
      evaluateSourceBatchHealth({
        sourceId: "txsef_scrape",
        rows: 0,
      }).state
    ).toBe("failing");
    expect(
      evaluateSourceBatchHealth({
        sourceId: "bennington_writers_scrape",
        rows: 0,
      }).state
    ).toBe("warning");
  });

  it("reports stale success and newer parser failure", () => {
    const source = sourceByCompetitionSource("txsef_scrape")!;
    expect(
      evaluateSourceOperationalHealth(
        source,
        [
          {
            source: "txsef_scrape",
            status: "succeeded",
            started_at: "2026-07-01T00:00:00.000Z",
            finished_at: "2026-07-01T00:01:00.000Z",
          },
        ],
        new Date("2026-08-13T00:00:00.000Z")
      ).state
    ).toBe("warning");
    expect(
      evaluateSourceOperationalHealth(source, [
        {
          source: "txsef_scrape",
          status: "failed",
          started_at: "2026-08-13T01:00:00.000Z",
          finished_at: "2026-08-13T01:01:00.000Z",
        },
        {
          source: "txsef_scrape",
          status: "succeeded",
          started_at: "2026-08-13T00:00:00.000Z",
          finished_at: "2026-08-13T00:01:00.000Z",
        },
      ]).state
    ).toBe("failing");
  });

  it("counts only enabled sources as operational attention", () => {
    const enabled = sourceByCompetitionSource("txsef_scrape")!;
    const blocked = sourceByCompetitionSource("vex_events_scrape")!;
    expect(
      sourceNeedsOperationalAttention(
        enabled,
        evaluateSourceOperationalHealth(enabled, [])
      )
    ).toBe(true);
    expect(
      sourceNeedsOperationalAttention(
        blocked,
        evaluateSourceOperationalHealth(blocked, [])
      )
    ).toBe(false);
  });

  it("keeps the corrected workflow least-privilege and permitted-only", () => {
    const workflow = repositoryFile(".github/workflows/ingest.yml");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("actions/setup-node@v7");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("Check Supabase secrets");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toMatch(/^\s+schedule:/m);
    expect(workflow).toContain('cron: "0 11 * * 1,4"');
    expect(workflow).toContain(
      "github.event_name == 'schedule' && 'dev' || github.ref"
    );
    expect(workflow).not.toContain("- tabroom_scrape");
    expect(workflow).not.toContain("- vex_events_scrape");
    expect(workflow).toContain("- doe_science_bowl_scrape");
    expect(workflow).toContain("doe_science_bowl_scrape) npm run scrape:doe-science-bowl");
    expect(workflow).toContain(
      "congressional_app_challenge_scrape) npm run scrape:congressional-app-challenge"
    );
    expect(workflow).toContain("IFS=',' read -ra SELECTED_SOURCES");
    expect(workflow).toContain("PURGE_DRY_RUN=1 npm run purge:stale");

    const discovery = repositoryFile("ingestion/scrape-discovery.ts");
    expect(discovery).toContain("ingestion/scrape-doe-science-bowl.ts");
    expect(discovery).not.toContain("ingestion/scrape-vex-events.ts");
  });
});
