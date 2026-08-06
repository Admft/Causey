import { getSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CompetitionSchema,
  DEFAULT_SEARCH_LIMIT,
  QualificationRuleSchema,
  SectionSchema,
  SeriesSchema,
  ZipSchema,
  type QualificationRule,
  type SearchFilters,
  type Series,
  type ZipRow,
} from "@/lib/schemas";
import {
  buildCompetitionResult,
  haversineMiles,
  paginateResults,
  parseCompetitionRow,
  radiusBoundingBox,
  sortCompetitionResults,
} from "@/lib/data/search";
import { competitionIsFeatured } from "@/lib/event-standing";
import { todayIsoDate } from "@/lib/competition-timing";
import type {
  CompetitionDetail,
  CompetitionRef,
  CompetitionResult,
  CompetitionSearchPage,
  DataSource,
} from "@/lib/data/types";

/**
 * Supabase DataSource. Selected with DATA_SOURCE=supabase; requires
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Coarse predicates (status, state, date, optional lat/lng box) are pushed
 * into SQL. Without a zip we page in SQL (limit/offset). With a zip we bound
 * the box then sort by distance in JS and page. Section eligibility matching
 * is shared with mock mode via lib/data/filtering.ts.
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

function hasSectionFilters(filters: SearchFilters): boolean {
  return Boolean(
    filters.grade_band || filters.rating_band || filters.max_fee_cents !== undefined
  );
}

export class SupabaseDataSource implements DataSource {
  constructor(private readonly requestClient?: SupabaseClient) {}

  private client(): SupabaseClient {
    return this.requestClient ?? requireClient();
  }

  private async preferredOrgIds(client: SupabaseClient): Promise<Set<string>> {
    if (!this.requestClient) return new Set();

    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return new Set();

    const [memberships, ownedOrgs] = await Promise.all([
      client
        .from("org_memberships")
        .select("org_id")
        .eq("profile_id", user.id)
        .eq("status", "active"),
      client.from("organizations").select("id").eq("created_by", user.id),
    ]);

    return new Set([
      ...(memberships.data ?? []).map((membership) => membership.org_id as string),
      ...(ownedOrgs.data ?? []).map((org) => org.id as string),
    ]);
  }

  async searchCompetitions(filters: SearchFilters): Promise<CompetitionSearchPage> {
    const client = this.client();
    const limit = filters.limit ?? DEFAULT_SEARCH_LIMIT;
    const offset = filters.offset ?? 0;
    const [origin, preferredOrgIds] = await Promise.all([
      filters.zip ? this.getZip(filters.zip) : Promise.resolve(null),
      this.preferredOrgIds(client),
    ]);
    const radius = filters.radius_miles ?? 50;

    // Fast path: no geo sort needed — page in SQL using the requested rank.
    // Skip when JS filters need the full set (sections, name, featured).
    const canPageInSql =
      !origin && !hasSectionFilters(filters) && !filters.q && !filters.featured;
    const shouldBoostMemberOrgs =
      canPageInSql &&
      preferredOrgIds.size > 0 &&
      (filters.sort ?? "popular") === "popular";

    let query = client
      .from("competitions")
      .select("*, sections(*), series(*)", canPageInSql ? { count: "exact" } : undefined)
      .eq("status", "published");

    if (filters.q) query = query.ilike("name", `%${filters.q}%`);
    if (filters.state) query = query.eq("state", filters.state);
    if (filters.source) query = query.eq("source", filters.source);
    if (filters.date_from) query = query.gte("start_date", filters.date_from);
    if (filters.date_to) query = query.lte("start_date", filters.date_to);

    // Push upcoming/ended into SQL so paged counts stay correct.
    // End date = end_date when set, else start_date.
    const today = todayIsoDate();
    const timing = filters.timing ?? "upcoming";
    if (timing === "upcoming") {
      query = query.or(
        `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`
      );
    } else if (timing === "ended") {
      query = query.or(
        `end_date.lt.${today},and(end_date.is.null,start_date.lt.${today})`
      );
    }

    if (origin) {
      const box = radiusBoundingBox(origin.lat, origin.lng, radius);
      query = query
        .gte("lat", box.minLat)
        .lte("lat", box.maxLat)
        .gte("lng", box.minLng)
        .lte("lng", box.maxLng);
    }

    if (canPageInSql) {
      if ((filters.sort ?? "popular") === "popular") {
        query = query.order("interest_count", { ascending: false });
      }
      query = query
        .order("start_date", { ascending: true })
        .order("id", { ascending: true })
        .range(shouldBoostMemberOrgs ? 0 : offset, offset + limit - 1);
    } else {
      query = query.order("start_date", { ascending: true });
    }

    let preferredQuery = shouldBoostMemberOrgs
      ? client
          .from("competitions")
          .select("*, sections(*), series(*)")
          .eq("status", "published")
          .in("org_id", [...preferredOrgIds])
      : null;
    if (preferredQuery && filters.state) {
      preferredQuery = preferredQuery.eq("state", filters.state);
    }
    if (preferredQuery && filters.source) {
      preferredQuery = preferredQuery.eq("source", filters.source);
    }
    if (preferredQuery && filters.date_from) {
      preferredQuery = preferredQuery.gte("start_date", filters.date_from);
    }
    if (preferredQuery && filters.date_to) {
      preferredQuery = preferredQuery.lte("start_date", filters.date_to);
    }
    if (preferredQuery && timing === "upcoming") {
      preferredQuery = preferredQuery.or(
        `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`
      );
    } else if (preferredQuery && timing === "ended") {
      preferredQuery = preferredQuery.or(
        `end_date.lt.${today},and(end_date.is.null,start_date.lt.${today})`
      );
    }

    const [searchResponse, preferredResponse] = await Promise.all([
      query,
      preferredQuery?.order("start_date", { ascending: true }) ?? Promise.resolve(null),
    ]);
    const { data, error, count } = searchResponse;
    if (error) throw new Error(`Supabase search failed: ${error.message}`);
    if (preferredResponse?.error) {
      throw new Error(`Supabase member search failed: ${preferredResponse.error.message}`);
    }

    const results: CompetitionResult[] = [];
    const seen = new Set<string>();
    for (const row of [...(data ?? []), ...(preferredResponse?.data ?? [])]) {
      const parsed = parseCompetitionRow(row as Record<string, unknown>);
      if (!parsed || seen.has(parsed.competition.id)) continue;
      seen.add(parsed.competition.id);

      if (filters.featured) {
        const series =
          parsed.series && typeof parsed.series === "object"
            ? (parsed.series as { level: "local" | "state" | "national" | "international"; name: string })
            : null;
        if (
          !competitionIsFeatured({
            name: parsed.competition.name,
            source: parsed.competition.source,
            series,
          })
        ) {
          continue;
        }
      }

      let distance_miles: number | null = null;
      if (origin) {
        distance_miles = haversineMiles(
          origin.lat,
          origin.lng,
          parsed.competition.lat,
          parsed.competition.lng
        );
        if (distance_miles > radius) continue;
      }

      const hit = buildCompetitionResult({
        competition: parsed.competition,
        sections: parsed.sections,
        series: parsed.series,
        distance_miles,
        filters,
      });
      if (hit) results.push(hit);
    }

    if (canPageInSql) {
      if (shouldBoostMemberOrgs) {
        sortCompetitionResults(results, filters, preferredOrgIds);
        return {
          results: results.slice(offset, offset + limit),
          total: count ?? results.length,
          limit,
          offset,
        };
      }

      // Already paged in SQL; keep date order (no distance). Name search uses slow path.
      return {
        results,
        total: count ?? results.length + offset,
        limit,
        offset,
      };
    }

    sortCompetitionResults(results, filters, preferredOrgIds);
    return paginateResults(results, { ...filters, limit, offset });
  }

  async getCompetitionBySlug(slug: string): Promise<CompetitionDetail | null> {
    const client = this.client();
    const { data, error } = await client
      .from("competitions")
      .select("*, sections(*), series(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
    if (!data || data.canonical_id) return null;

    const { sections: rawSections, series: rawSeries, ...rawComp } = data;
    return {
      ...CompetitionSchema.parse(rawComp),
      sections: (rawSections ?? []).map((s: unknown) => SectionSchema.parse(s)),
      series: rawSeries ? SeriesSchema.parse(rawSeries) : null,
    };
  }

  async listCompetitionRefs(): Promise<CompetitionRef[]> {
    const client = this.client();
    const { data, error } = await client
      .from("competitions")
      .select("id, slug, name, series_id, state, start_date, canonical_id")
      .eq("status", "published")
      .order("name");
    if (error) {
      // Pre-0005 DBs lack canonical_id — fall back.
      if (error.message.includes("canonical_id")) {
        const retry = await client
          .from("competitions")
          .select("id, slug, name, series_id, state, start_date")
          .eq("status", "published")
          .order("name");
        if (retry.error) throw new Error(`Supabase list failed: ${retry.error.message}`);
        return (retry.data ?? []) as CompetitionRef[];
      }
      throw new Error(`Supabase list failed: ${error.message}`);
    }
    return ((data ?? []) as (CompetitionRef & { canonical_id?: string | null })[])
      .filter((r) => !r.canonical_id)
      .map(({ id, slug, name, series_id, state, start_date }) => ({
        id,
        slug,
        name,
        series_id,
        state,
        start_date,
      }));
  }

  async listSeries(): Promise<Series[]> {
    const client = this.client();
    const { data, error } = await client.from("series").select("*").order("name");
    if (error) throw new Error(`Supabase series list failed: ${error.message}`);
    return (data ?? []).map((s) => SeriesSchema.parse(s));
  }

  async listQualificationRules(): Promise<QualificationRule[]> {
    const client = this.client();
    const { data, error } = await client.from("qualification_rules").select("*");
    if (error) throw new Error(`Supabase rules list failed: ${error.message}`);
    return (data ?? []).map((r) => QualificationRuleSchema.parse(r));
  }

  async getZip(zip: string): Promise<ZipRow | null> {
    const client = this.client();
    const { data, error } = await client
      .from("zips")
      .select("*")
      .eq("zip", zip)
      .maybeSingle();
    if (error) throw new Error(`Supabase zip lookup failed: ${error.message}`);
    return data ? ZipSchema.parse(data) : null;
  }
}
