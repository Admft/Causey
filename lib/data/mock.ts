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
import { haversineMiles } from "@/lib/geo";
import {
  competitionNameRank,
  competitionInDateWindow,
  matchingSectionIds,
} from "@/lib/data/filtering";
import type {
  CompetitionDetail,
  CompetitionRef,
  CompetitionResult,
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
  async searchCompetitions(filters: SearchFilters): Promise<CompetitionResult[]> {
    const origin = filters.zip ? zipByCode.get(filters.zip) ?? null : null;
    const radius = filters.radius_miles ?? 50;

    const results: CompetitionResult[] = [];
    for (const c of competitions) {
      if (c.status !== "published") continue;
      if (filters.q && !c.name.toLowerCase().includes(filters.q.toLowerCase())) continue;
      if (filters.state && c.state !== filters.state) continue;
      if (!competitionInDateWindow(c, filters)) continue;

      let distance_miles: number | null = null;
      if (origin) {
        distance_miles = haversineMiles(origin.lat, origin.lng, c.lat, c.lng);
        if (distance_miles > radius) continue;
      }

      const compSections = sectionsByCompetition.get(c.id) ?? [];
      const matching = matchingSectionIds(c, compSections, filters);
      // Grade/rating/fee filters are section-level: a competition with zero
      // eligible sections is not a result.
      const hasSectionFilters =
        filters.grade_band || filters.rating_band || filters.max_fee_cents !== undefined;
      if (hasSectionFilters && matching.length === 0) continue;

      results.push({
        ...c,
        sections: compSections,
        series: c.series_id ? seriesById.get(c.series_id) ?? null : null,
        distance_miles,
        matching_section_ids: matching,
      });
    }

    results.sort((a, b) => {
      if (filters.q) {
        const rankDelta =
          competitionNameRank(a.name, filters.q) - competitionNameRank(b.name, filters.q);
        if (rankDelta !== 0) return rankDelta;
      }
      if (a.distance_miles !== null && b.distance_miles !== null) {
        if (Math.abs(a.distance_miles - b.distance_miles) > 0.5) {
          return a.distance_miles - b.distance_miles;
        }
      }
      return a.start_date.localeCompare(b.start_date);
    });
    return results;
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
