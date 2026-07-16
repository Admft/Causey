import { getSupabaseClient } from "@/lib/supabase/client";
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
 * Supabase DataSource. Selected with DATA_SOURCE=supabase; requires
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Coarse predicates (status, state, date window) are pushed into SQL.
 * Radius filtering currently happens in JS over the candidate set after the
 * cheap filters — correct, and fine at MVP data volumes (hundreds of rows).
 * TODO(perf): switch to the earthdistance index in 0001_init.sql via an RPC
 * (`earth_box(ll_to_earth(...), radius)`) once the table is large enough to
 * matter. Section eligibility matching is shared with mock mode via
 * lib/data/filtering.ts so the two modes can never diverge.
 */

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "DATA_SOURCE=supabase but NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Fill .env from .env.example, or unset DATA_SOURCE to run on mock data."
    );
  }
  return client;
}

export class SupabaseDataSource implements DataSource {
  async searchCompetitions(filters: SearchFilters): Promise<CompetitionResult[]> {
    const client = requireClient();

    let query = client
      .from("competitions")
      .select("*, sections(*), series(*)")
      .eq("status", "published");
    if (filters.state) query = query.eq("state", filters.state);
    if (filters.date_from) query = query.gte("start_date", filters.date_from);
    if (filters.date_to) query = query.lte("start_date", filters.date_to);

    const { data, error } = await query;
    if (error) throw new Error(`Supabase search failed: ${error.message}`);

    const origin = filters.zip ? await this.getZip(filters.zip) : null;
    const radius = filters.radius_miles ?? 50;

    const results: CompetitionResult[] = [];
    for (const row of data ?? []) {
      const { sections: rawSections, series: rawSeries, ...rawComp } = row;
      const c: Competition = CompetitionSchema.parse(rawComp);
      if (!competitionInDateWindow(c, filters)) continue;

      let distance_miles: number | null = null;
      if (origin) {
        distance_miles = haversineMiles(origin.lat, origin.lng, c.lat, c.lng);
        if (distance_miles > radius) continue;
      }

      const compSections: Section[] = (rawSections ?? []).map((s: unknown) =>
        SectionSchema.parse(s)
      );
      const matching = matchingSectionIds(c, compSections, filters);
      const hasSectionFilters =
        filters.grade_band || filters.rating_band || filters.max_fee_cents !== undefined;
      if (hasSectionFilters && matching.length === 0) continue;

      results.push({
        ...c,
        sections: compSections,
        series: rawSeries ? SeriesSchema.parse(rawSeries) : null,
        distance_miles,
        matching_section_ids: matching,
      });
    }

    results.sort((a, b) => {
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
    const client = requireClient();
    const { data, error } = await client
      .from("competitions")
      .select("*, sections(*), series(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
    if (!data) return null;

    const { sections: rawSections, series: rawSeries, ...rawComp } = data;
    return {
      ...CompetitionSchema.parse(rawComp),
      sections: (rawSections ?? []).map((s: unknown) => SectionSchema.parse(s)),
      series: rawSeries ? SeriesSchema.parse(rawSeries) : null,
    };
  }

  async listCompetitionRefs(): Promise<CompetitionRef[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("competitions")
      .select("id, slug, name, series_id, state, start_date")
      .eq("status", "published")
      .order("name");
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return (data ?? []) as CompetitionRef[];
  }

  async listSeries(): Promise<Series[]> {
    const client = requireClient();
    const { data, error } = await client.from("series").select("*").order("name");
    if (error) throw new Error(`Supabase series list failed: ${error.message}`);
    return (data ?? []).map((s) => SeriesSchema.parse(s));
  }

  async listQualificationRules(): Promise<QualificationRule[]> {
    const client = requireClient();
    const { data, error } = await client.from("qualification_rules").select("*");
    if (error) throw new Error(`Supabase rules list failed: ${error.message}`);
    return (data ?? []).map((r) => QualificationRuleSchema.parse(r));
  }

  async getZip(zip: string): Promise<ZipRow | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("zips")
      .select("*")
      .eq("zip", zip)
      .maybeSingle();
    if (error) throw new Error(`Supabase zip lookup failed: ${error.message}`);
    return data ? ZipSchema.parse(data) : null;
  }
}
