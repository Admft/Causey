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
  paginateResults,
  parseCompetitionRow,
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

let qualificationRulesCache: { at: number; rules: QualificationRule[] } | null =
  null;
const QUALIFICATION_RULES_TTL_MS = 5 * 60 * 1000;
const RADIUS_SCAN_CAP = 200;

type RadiusHit = {
  id: string;
  distance_miles: number | null;
  total_count: number | string;
};

/**
 * Supabase DataSource. Selected with DATA_SOURCE=supabase; requires
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Coarse predicates (status, state, date) are pushed into SQL. Zip search
 * uses search_competitions_in_radius (earthdistance). Without a zip we page
 * in SQL. Section eligibility matching is shared with mock mode via
 * lib/data/filtering.ts.
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
    filters.grade_band ||
      filters.rating_band ||
      filters.max_fee_cents !== undefined ||
      filters.facet
  );
}

/** Escape Postgres LIKE wildcards so user text is matched literally. */
export function escapePostgrestLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
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

    const directIds = new Set([
      ...(memberships.data ?? []).map((membership) => membership.org_id as string),
      ...(ownedOrgs.data ?? []).map((org) => org.id as string),
    ]);
    if (!directIds.size) return directIds;

    const [directOrgs, childOrgs] = await Promise.all([
      client
        .from("organizations")
        .select("id, parent_org_id")
        .in("id", [...directIds]),
      client
        .from("organizations")
        .select("id")
        .in("parent_org_id", [...directIds]),
    ]);
    for (const org of directOrgs.data ?? []) {
      if (org.parent_org_id) directIds.add(org.parent_org_id as string);
    }
    for (const org of childOrgs.data ?? []) {
      directIds.add(org.id as string);
    }
    return directIds;
  }

  private async clubGoingCompetitionIds(
    client: SupabaseClient,
    orgIds: Set<string>
  ): Promise<Set<string>> {
    if (!orgIds.size) return new Set();
    const { data, error } = await client
      .from("org_competition_attendance")
      .select("competition_id")
      .in("org_id", [...orgIds]);
    if (error) return new Set();
    return new Set(
      (data ?? []).map((row) => row.competition_id as string)
    );
  }

  async searchCompetitions(filters: SearchFilters): Promise<CompetitionSearchPage> {
    const client = this.client();
    const limit = filters.limit ?? DEFAULT_SEARCH_LIMIT;
    const offset = filters.offset ?? 0;
    const [origin, preferredOrgIds] = await Promise.all([
      filters.zip ? this.getZip(filters.zip) : Promise.resolve(null),
      this.preferredOrgIds(client),
    ]);
    const clubGoingIds = filters.club_going
      ? await this.clubGoingCompetitionIds(client, preferredOrgIds)
      : null;
    if (clubGoingIds && clubGoingIds.size === 0) {
      return { results: [], total: 0, limit, offset };
    }

    if (origin) {
      return this.searchByRadius({
        client,
        origin,
        radius: filters.radius_miles ?? 50,
        filters,
        limit,
        offset,
        preferredOrgIds,
        clubGoingIds,
      });
    }

    // Fast path: no geo sort needed — page in SQL using the requested rank.
    // Skip when JS filters need the full set (sections, name, featured).
    const canPageInSql =
      !hasSectionFilters(filters) &&
      !filters.q &&
      !filters.featured &&
      !filters.club_going;
    const shouldBoostMemberOrgs =
      canPageInSql &&
      preferredOrgIds.size > 0 &&
      (filters.sort ?? "popular") === "popular";

    let query = client
      .from("competitions")
      .select("*, sections(*), series(*)", canPageInSql ? { count: "exact" } : undefined)
      .eq("status", "published");

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.q) {
      query = query.ilike("name", `%${escapePostgrestLikePattern(filters.q)}%`);
    }
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
    if (preferredQuery && filters.category) {
      preferredQuery = preferredQuery.eq("category", filters.category);
    }
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

      if (clubGoingIds && !clubGoingIds.has(parsed.competition.id)) {
        continue;
      }

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
            details: parsed.competition.details,
          })
        ) {
          continue;
        }
      }

      const hit = buildCompetitionResult({
        competition: parsed.competition,
        sections: parsed.sections,
        series: parsed.series,
        distance_miles: null,
        filters,
      });
      if (hit) {
        hit.viewer_org_match = Boolean(
          hit.org_id && preferredOrgIds.has(hit.org_id)
        );
        results.push(hit);
      }
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

  private async searchByRadius(input: {
    client: SupabaseClient;
    origin: ZipRow;
    radius: number;
    filters: SearchFilters;
    limit: number;
    offset: number;
    preferredOrgIds: Set<string>;
    clubGoingIds: Set<string> | null;
  }): Promise<CompetitionSearchPage> {
    const {
      client,
      origin,
      radius,
      filters,
      limit,
      offset,
      preferredOrgIds,
      clubGoingIds,
    } = input;
    const needsJsWindow =
      hasSectionFilters(filters) ||
      Boolean(filters.featured) ||
      Boolean(filters.club_going) ||
      preferredOrgIds.size > 0;
    const rpcLimit = needsJsWindow ? RADIUS_SCAN_CAP : Math.min(limit, RADIUS_SCAN_CAP);
    const rpcOffset = needsJsWindow ? 0 : offset;

    const { data: hits, error: rpcError } = await client.rpc(
      "search_competitions_in_radius",
      {
        p_lat: origin.lat,
        p_lng: origin.lng,
        p_radius_miles: radius,
        p_category: filters.category ?? null,
        p_q: filters.q ?? null,
        p_state: filters.state ?? null,
        p_source: filters.source ?? null,
        p_date_from: filters.date_from ?? null,
        p_date_to: filters.date_to ?? null,
        p_timing: filters.timing ?? "upcoming",
        p_sort: filters.sort ?? "popular",
        p_limit: rpcLimit,
        p_offset: rpcOffset,
      }
    );
    if (rpcError) {
      throw new Error(`Supabase radius search failed: ${rpcError.message}`);
    }

    const radiusHits = (hits ?? []) as RadiusHit[];
    const totalFromRpc = Number(radiusHits[0]?.total_count ?? 0);
    if (!radiusHits.length) {
      return { results: [], total: 0, limit, offset };
    }

    const distanceById = new Map(
      radiusHits.map((hit) => [
        hit.id,
        hit.distance_miles === null ? null : Number(hit.distance_miles),
      ])
    );
    const { data, error } = await client
      .from("competitions")
      .select("*, sections(*), series(*)")
      .in(
        "id",
        radiusHits.map((hit) => hit.id)
      );
    if (error) throw new Error(`Supabase search failed: ${error.message}`);

    const byId = new Map(
      (data ?? []).map((row) => [row.id as string, row as Record<string, unknown>])
    );
    const results: CompetitionResult[] = [];
    for (const hit of radiusHits) {
      const row = byId.get(hit.id);
      if (!row) continue;
      const parsed = parseCompetitionRow(row);
      if (!parsed) continue;

      if (clubGoingIds && !clubGoingIds.has(parsed.competition.id)) {
        continue;
      }

      if (filters.featured) {
        const series =
          parsed.series && typeof parsed.series === "object"
            ? (parsed.series as {
                level: "local" | "state" | "national" | "international";
                name: string;
              })
            : null;
        if (
          !competitionIsFeatured({
            name: parsed.competition.name,
            source: parsed.competition.source,
            series,
            details: parsed.competition.details,
          })
        ) {
          continue;
        }
      }

      const built = buildCompetitionResult({
        competition: parsed.competition,
        sections: parsed.sections,
        series: parsed.series,
        distance_miles: distanceById.get(hit.id) ?? null,
        filters,
      });
      if (built) {
        built.viewer_org_match = Boolean(
          built.org_id && preferredOrgIds.has(built.org_id)
        );
        results.push(built);
      }
    }

    if (needsJsWindow) {
      sortCompetitionResults(results, filters, preferredOrgIds);
      return paginateResults(results, { ...filters, limit, offset });
    }

    return {
      results,
      total: totalFromRpc,
      limit,
      offset,
    };
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
      .eq("category", "chess")
      .order("name");
    if (error) {
      // Pre-0005 DBs lack canonical_id — fall back.
      if (error.message.includes("canonical_id")) {
        const retry = await client
          .from("competitions")
          .select("id, slug, name, series_id, state, start_date")
          .eq("status", "published")
          .eq("category", "chess")
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

  async listPathwayCompetitionRefs(): Promise<CompetitionRef[]> {
    const client = this.client();
    const rules = await this.listQualificationRules();
    const seriesIds = [
      ...new Set(
        rules
          .filter((rule) => rule.required_placement >= 1 && rule.from_series_id)
          .map((rule) => rule.from_series_id as string)
      ),
    ];
    const competitionIds = [
      ...new Set(
        rules
          .filter((rule) => rule.required_placement >= 1 && rule.from_competition_id)
          .map((rule) => rule.from_competition_id as string)
      ),
    ];
    if (!seriesIds.length && !competitionIds.length) return [];

    let query = client
      .from("competitions")
      .select("id, slug, name, series_id, state, start_date, canonical_id")
      .eq("status", "published")
      .eq("category", "chess")
      .order("name");
    if (seriesIds.length && competitionIds.length) {
      query = query.or(
        `id.in.(${competitionIds.join(",")}),series_id.in.(${seriesIds.join(",")})`
      );
    } else if (competitionIds.length) {
      query = query.in("id", competitionIds);
    } else {
      query = query.in("series_id", seriesIds);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase pathway list failed: ${error.message}`);
    return ((data ?? []) as (CompetitionRef & { canonical_id?: string | null })[])
      .filter((row) => !row.canonical_id)
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
    if (
      qualificationRulesCache &&
      Date.now() - qualificationRulesCache.at < QUALIFICATION_RULES_TTL_MS
    ) {
      return qualificationRulesCache.rules;
    }
    const client = this.client();
    const { data, error } = await client.from("qualification_rules").select("*");
    if (error) throw new Error(`Supabase rules list failed: ${error.message}`);
    const rules = (data ?? []).map((r) => QualificationRuleSchema.parse(r));
    qualificationRulesCache = { at: Date.now(), rules };
    return rules;
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
