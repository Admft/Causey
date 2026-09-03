import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_SCRAPER_OPTIONS } from "@/lib/admin-scrapers";
import {
  competitionSourceOptionsForCategory,
  INGESTION_SOURCES,
  isCompetitionSourceFilter,
} from "@/lib/ingestion-sources";
import { CompetitionSourceSchema } from "@/lib/schemas";
import { CATEGORY_SOURCE_CONFIG } from "@/ingestion/normalize-category-source";
import { chessCompetitionIds } from "@/ingestion/persist";

const migrationsDir = resolve(process.cwd(), "supabase", "migrations");

function migration(filename: string): string {
  return readFileSync(resolve(migrationsDir, filename), "utf8");
}

function sourceConstraintValues(sql: string, constraint: string): string[] {
  const match = sql.match(
    new RegExp(
      `add\\s+constraint\\s+${constraint}\\s+check\\s*\\(\\s*source\\s+in\\s*\\(([\\s\\S]*?)\\)\\s*\\)\\s*;`,
      "i"
    )
  );
  if (!match) throw new Error(`Missing ${constraint}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

const manualSources = ["manual", "tla_scrape", "cca_scrape", "organizer"];
const hubSources = [
  ...manualSources,
  "onlinereg_scrape",
  "chess_results_scrape",
  "fide_calendar_scrape",
];
const tcaSources = [...hubSources, "tca_scrape"];
const categoryBaseSources = [
  ...tcaSources,
  "tabroom_scrape",
  "vex_events_scrape",
  "taea_vase_scrape",
  "bennington_writers_scrape",
];

const cumulativeMigrations = [
  {
    file: "0019_hub_scrape_sources.sql",
    competitionSources: hubSources,
  },
  {
    file: "0032_tca_scrape_source.sql",
    competitionSources: tcaSources,
  },
  {
    file: "0047_multi_category_discovery_sources.sql",
    competitionSources: categoryBaseSources,
  },
  {
    file: "0048_doe_science_bowl_source.sql",
    competitionSources: [...categoryBaseSources, "doe_science_bowl_scrape"],
  },
  {
    file: "0049_afsa_essay_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
    ],
  },
  {
    file: "0050_uil_theatre_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
      "uil_theatre_scrape",
    ],
  },
  {
    file: "0052_uil_speech_debate_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
      "uil_theatre_scrape",
      "uil_speech_debate_scrape",
    ],
  },
  {
    file: "0053_purple_comet_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
      "uil_theatre_scrape",
      "uil_speech_debate_scrape",
      "purple_comet_scrape",
    ],
  },
  {
    file: "0054_uil_music_marching_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
      "uil_theatre_scrape",
      "uil_speech_debate_scrape",
      "purple_comet_scrape",
      "uil_music_marching_scrape",
    ],
  },
  {
    file: "0055_txsef_source.sql",
    competitionSources: [
      ...categoryBaseSources,
      "doe_science_bowl_scrape",
      "afsa_essay_scrape",
      "uil_theatre_scrape",
      "uil_speech_debate_scrape",
      "purple_comet_scrape",
      "uil_music_marching_scrape",
      "txsef_scrape",
    ],
  },
] as const;

const categorySourceRows = [
  ["0048_doe_science_bowl_source.sql", "doe_science_bowl_scrape", "live", "stem"],
  ["0049_afsa_essay_source.sql", "afsa_essay_scrape", "live", "writing"],
  ["0050_uil_theatre_source.sql", "uil_theatre_scrape", "live", "arts"],
  [
    "0052_uil_speech_debate_source.sql",
    "uil_speech_debate_scrape",
    "live",
    "debate",
  ],
  ["0053_purple_comet_source.sql", "purple_comet_scrape", "live", "stem"],
  [
    "0054_uil_music_marching_source.sql",
    "uil_music_marching_scrape",
    "live",
    "arts",
  ],
  ["0055_txsef_source.sql", "txsef_scrape", "live", "stem"],
] as const;

describe("pending source migration batch safety", () => {
  it("keeps every source constraint cumulative through 0055", () => {
    for (const snapshot of cumulativeMigrations) {
      const sql = migration(snapshot.file);
      expect(
        sourceConstraintValues(sql, "competitions_source_check"),
        snapshot.file
      ).toEqual(snapshot.competitionSources);
      expect(
        sourceConstraintValues(sql, "competition_sources_source_check"),
        snapshot.file
      ).toEqual(snapshot.competitionSources);
      expect(
        sourceConstraintValues(sql, "scrape_runs_source_check"),
        snapshot.file
      ).toEqual([
        ...snapshot.competitionSources.filter(
          (source) => source !== "manual" && source !== "organizer"
        ),
        "all",
      ]);
    }
  });

  it("keeps pending filenames ordered and reproducible", () => {
    expect(
      readdirSync(migrationsDir)
        .filter((name) => /^00(?:4[8-9]|5[0-5])_/.test(name))
        .sort()
    ).toEqual([
      "0048_doe_science_bowl_source.sql",
      "0049_afsa_essay_source.sql",
      "0050_uil_theatre_source.sql",
      "0051_pause_tabroom_automation.sql",
      "0052_uil_speech_debate_source.sql",
      "0053_purple_comet_source.sql",
      "0054_uil_music_marching_source.sql",
      "0055_txsef_source.sql",
    ]);
  });

  it("uses valid live categories for every added ingestion source", () => {
    for (const [file, id, status, category] of categorySourceRows) {
      const sql = migration(file).replace(/\s+/g, " ");
      expect(sql, file).toMatch(
        new RegExp(
          `values \\( '${id}',[\\s\\S]*?'${status}', '${category}' \\)`,
          "i"
        )
      );
      expect(sql, file).toContain("on conflict (id) do update set");
    }
    const baseline = migration("0047_multi_category_discovery_sources.sql");
    expect(baseline).toContain(
      "check (category in ('chess', 'stem', 'debate', 'arts', 'writing'))"
    );
    const statusDefinition = migration("0007_pathway_enrichment.sql");
    expect(statusDefinition).toContain("check (status in ('live', 'soon'))");
  });

  it("keeps source-constraint migrations safely repeatable", () => {
    for (const snapshot of cumulativeMigrations.filter((entry) =>
      /^00(?:4[8-9]|5[0-5])_/.test(entry.file)
    )) {
      const sql = migration(snapshot.file).replace(/\s+/g, " ");
      for (const constraint of [
        "competitions_source_check",
        "competition_sources_source_check",
        "scrape_runs_source_check",
      ]) {
        expect(sql, `${snapshot.file}: ${constraint}`).toContain(
          `drop constraint if exists ${constraint}`
        );
      }
      expect(sql, snapshot.file).toContain("on conflict (id) do update set");
    }
  });

  it("archives only primary Tabroom rows without provenance mutation", () => {
    const sql = migration("0051_pause_tabroom_automation.sql");
    const executable = sql
      .replace(/--.*$/gm, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(executable).toContain(
      "update public.ingestion_sources set blurb ="
    );
    expect(executable).toContain(
      "update public.competitions set status = 'archived'"
    );
    expect(executable).toContain(
      "where source = 'tabroom_scrape' and status <> 'archived'"
    );
    expect(executable).not.toMatch(/\bdelete\s+from\b/i);
    expect(executable).not.toMatch(
      /\b(?:update|insert\s+into|delete\s+from)\s+public\.competition_sources\b/i
    );
    expect(executable).not.toMatch(
      /\b(?:update|insert\s+into|delete\s+from)\s+public\.scrape_runs\b/i
    );
    expect(executable).not.toMatch(/\bsource\s*=\s*'(?:manual|organizer)'\b/i);
  });

  it("keeps Tabroom fail-closed outside reference surfaces", () => {
    const adminValues = ADMIN_SCRAPER_OPTIONS.map((option) => option.value);
    expect(adminValues).not.toContain("tabroom_scrape");
    expect(isCompetitionSourceFilter("tabroom_scrape")).toBe(false);
    expect(
      competitionSourceOptionsForCategory("debate").map((option) => option.value)
    ).not.toContain("tabroom_scrape");
    expect(
      INGESTION_SOURCES.find((source) => source.id === "tabroom_scrape")
    ).toMatchObject({ status: "soon" });

    const workflow = readFileSync(
      resolve(process.cwd(), ".github", "workflows", "ingest.yml"),
      "utf8"
    );
    const discoveryRunner = readFileSync(
      resolve(process.cwd(), "ingestion", "scrape-discovery.ts"),
      "utf8"
    );
    expect(workflow).not.toContain("tabroom_scrape");
    expect(discoveryRunner).not.toContain('"ingestion/scrape-tabroom.ts"');
    expect(discoveryRunner).toContain("TABROOM_WRITTEN_PERMISSION=1");
  });

  it("aligns final SQL sources with Zod, ingestion, admin, and preflight", () => {
    const finalSources =
      cumulativeMigrations.at(-1)?.competitionSources ?? [];
    expect(CompetitionSourceSchema.options).toEqual(finalSources);

    const categorySources = Object.keys(CATEGORY_SOURCE_CONFIG);
    const represented = INGESTION_SOURCES.flatMap((source) =>
      source.competitionSource ? [source.competitionSource] : []
    );
    for (const source of categorySources) {
      expect(finalSources).toContain(source);
      expect(represented).toContain(source);
    }

    const adminValues = ADMIN_SCRAPER_OPTIONS.map((option) => option.value);
    for (const source of categorySources.filter(
      (source) =>
        source !== "tabroom_scrape" && source !== "vex_events_scrape"
    )) {
      expect(adminValues).toContain(source);
    }
    expect(adminValues).not.toContain("vex_events_scrape");
    expect(adminValues).toContain("doe_science_bowl_scrape");

    const preflight = readFileSync(
      resolve(process.cwd(), "scripts", "check-scrape-ready.ts"),
      "utf8"
    );
    for (const source of categorySources) expect(preflight).toContain(source);
    expect(preflight).toContain("through 0055");
  });

  it("passes only chess ids into series and pathway processing", () => {
    expect(
      chessCompetitionIds([
        { id: "chess-id", category: "chess" },
        { id: "stem-id", category: "stem" },
        { id: "debate-id", category: "debate" },
        { id: "arts-id", category: "arts" },
        { id: "writing-id", category: "writing" },
      ])
    ).toEqual(["chess-id"]);
  });
});
