import competitionsJson from "@/data/seed/competitions.json";
import sectionsJson from "@/data/seed/sections.json";
import seriesJson from "@/data/seed/series.json";
import rulesJson from "@/data/seed/qualification_rules.json";
import zipsJson from "@/data/zips.sample.json";

import {
  CompetitionSchema,
  QualificationRuleSchema,
  SectionSchema,
  SeriesSchema,
  ZipSchema,
  type Competition,
  type QualificationRule,
  type SearchFilters,
  type Section,
  type Series,
  type ZipRow,
} from "@/lib/schemas";
import {
  buildCompetitionResult,
  paginateResults,
  sortCompetitionResults,
} from "@/lib/data/search";
import { haversineMiles } from "@/lib/geo";
import type {
  CompetitionDetail,
  CompetitionRef,
  CompetitionResult,
  CompetitionSearchPage,
  DataSource,
} from "@/lib/data/types";

/**
 * Mock DataSource: the default. Reads /data/seed JSON in-process — no
 * network, no secrets. Seed data is Zod-validated once at module load so a
 * malformed seed file fails loudly at boot, not silently in a page.
 */

const competitions: Competition[] = competitionsJson.map((c) => CompetitionSchema.parse(c));
const sections: Section[] = sectionsJson.map((s) => SectionSchema.parse(s));
const series: Series[] = seriesJson.map((s) => SeriesSchema.parse(s));
const rules: QualificationRule[] = rulesJson.map((r) => QualificationRuleSchema.parse(r));
const zips: ZipRow[] = zipsJson.map((z) => ZipSchema.parse(z));

const sectionsByCompetition = new Map<string, Section[]>();
for (const s of sections) {
  const list = sectionsByCompetition.get(s.competition_id) ?? [];
  list.push(s);
  sectionsByCompetition.set(s.competition_id, list);
}
const seriesById = new Map(series.map((s) => [s.id, s]));
const zipByCode = new Map(zips.map((z) => [z.zip, z]));

export class MockDataSource implements DataSource {
  async searchCompetitions(filters: SearchFilters): Promise<CompetitionSearchPage> {
    const origin = filters.zip ? zipByCode.get(filters.zip) ?? null : null;
    const radius = filters.radius_miles ?? 50;

    const results: CompetitionResult[] = [];
    for (const c of competitions) {
      if (c.status !== "published") continue;
      if (filters.q && !c.name.toLowerCase().includes(filters.q.trim().toLowerCase())) continue;
      if (filters.state && c.state !== filters.state) continue;

      let distance_miles: number | null = null;
      if (origin) {
        distance_miles = haversineMiles(origin.lat, origin.lng, c.lat, c.lng);
        if (distance_miles > radius) continue;
      }

      const hit = buildCompetitionResult({
        competition: c,
        sections: sectionsByCompetition.get(c.id) ?? [],
        series: c.series_id ? seriesById.get(c.series_id) ?? null : null,
        distance_miles,
        filters,
      });
      if (hit) results.push(hit);
    }

    sortCompetitionResults(results, filters);
    return paginateResults(results, filters);
  }

  async getCompetitionBySlug(slug: string): Promise<CompetitionDetail | null> {
    const c = competitions.find((x) => x.slug === slug && x.status === "published");
    if (!c) return null;
    return {
      ...c,
      sections: sectionsByCompetition.get(c.id) ?? [],
      series: c.series_id ? seriesById.get(c.series_id) ?? null : null,
    };
  }

  async listCompetitionRefs(): Promise<CompetitionRef[]> {
    return competitions
      .filter((c) => c.status === "published")
      .map(({ id, slug, name, series_id, state, start_date }) => ({
        id,
        slug,
        name,
        series_id,
        state,
        start_date,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listSeries(): Promise<Series[]> {
    return [...series].sort((a, b) => a.name.localeCompare(b.name));
  }

  async listQualificationRules(): Promise<QualificationRule[]> {
    return rules;
  }

  async getZip(zip: string): Promise<ZipRow | null> {
    return zipByCode.get(zip) ?? null;
  }
}
