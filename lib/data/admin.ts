import "server-only";

import type { AdminTournamentListFilters } from "@/lib/admin-tournament-filters";
import { todayIsoDate } from "@/lib/competition-timing";
import {
  INGESTION_SOURCES,
  evaluateSourceOperationalHealth,
  isCompetitionSourceFilter,
  type IngestionSource,
  type SourceHealth,
} from "@/lib/ingestion-sources";
import { escapePostgrestLikePattern } from "@/lib/data/supabase";
import { isTournamentPublishReady } from "@/lib/tournament-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  type: "school" | "district" | "club" | "team";
  state: string | null;
  parent_org_id: string | null;
  verification_status: "pending" | "verified" | "rejected";
  verified_at: string | null;
  created_at: string;
  parent: {
    id: string;
    name: string;
    slug: string;
    verification_status: "pending" | "verified" | "rejected";
  } | null;
  organization_verification_reviews: {
    note: string | null;
    reviewed_at: string;
  }[];
  member_count: number;
  tournament_count: number;
};

export type AdminUserDirectoryRow = {
  profile_id: string;
  email: string;
  display_name: string;
  account_role: "student" | "parent" | "coach";
  role_unlocked: boolean;
  platform_admin: boolean;
  created_at: string;
  total_count: number;
};

export type AdminTournamentRow = {
  id: string;
  slug: string;
  name: string;
  category: "chess" | "stem" | "debate" | "arts" | "writing" | "other";
  custom_category_name: string | null;
  participation_mode: "in_person" | "online" | "hybrid";
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  entry_fee_cents: number | null;
  rated: boolean;
  visibility: "public" | "private";
  audience: "public" | "district" | "school" | "invite_only";
  source: string;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  org_id: string | null;
  created_at: string;
  updated_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    state: string | null;
    type: "school" | "club" | "team" | "district";
    parent_org_id: string | null;
  } | null;
  sections?: {
    name: string;
    min_rating: number | null;
    max_rating: number | null;
    min_grade: number | null;
    max_grade: number | null;
    entry_fee_cents: number | null;
  }[];
};

export type AdminAuditRow = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type AdminScrapeRunRow = {
  id: string;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "succeeded" | "failed";
  rows_staged: number | null;
  rows_upserted: number | null;
  error: string | null;
  meta: Record<string, unknown>;
};

export type AdminIngestionSourceHealth = {
  source: IngestionSource;
  health: SourceHealth;
};

export type AdminModerationQueueRow = {
  id: string;
  slug: string;
  name: string;
  category: "chess" | "stem" | "debate" | "arts" | "writing" | "other";
  custom_category_name: string | null;
  participation_mode: "in_person" | "online" | "hybrid";
  organizer_name: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  entry_fee_cents: number | null;
  rated: boolean;
  audience: "public" | "district" | "school" | "invite_only";
  source: string;
  status: "pending_review";
  submitted_for_review_at: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    verification_status: "pending" | "verified" | "rejected";
  } | null;
};

export async function getAdminOverview() {
  const supabase = await createServerSupabaseClient();
  const [organizations, drafts, pendingReview, published, archived] =
    await Promise.all([
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .eq("status", "archived"),
    ]);

  return {
    organizations: organizations.count ?? 0,
    drafts: drafts.count ?? 0,
    pendingReview: pendingReview.count ?? 0,
    published: published.count ?? 0,
    archived: archived.count ?? 0,
  };
}

export async function getAdminOrganizations(): Promise<AdminOrganizationRow[]> {
  const supabase = await createServerSupabaseClient();
  // Keep the org list query embed-light: a bad PostgREST relationship hint
  // (or a review table that is not on the linked project yet) used to fail the
  // whole select, and callers treated that as an empty directory.
  const [organizations, memberships, orgCompetitions, reviews] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, type, state, parent_org_id, verification_status, verified_at, created_at, parent:organizations!parent_org_id(id, name, slug, verification_status)"
        )
        .order("type")
        .order("name"),
      supabase.from("org_memberships").select("org_id, status"),
      supabase.from("competitions").select("org_id").not("org_id", "is", null),
      supabase
        .from("organization_verification_reviews")
        .select("org_id, note, reviewed_at"),
    ]);

  if (organizations.error) {
    console.error("getAdminOrganizations failed", organizations.error);
    return [];
  }

  const memberCounts = new Map<string, number>();
  if (!memberships.error) {
    for (const row of memberships.data ?? []) {
      if (row.status === "removed") continue;
      memberCounts.set(row.org_id, (memberCounts.get(row.org_id) ?? 0) + 1);
    }
  }
  const tournamentCounts = new Map<string, number>();
  if (!orgCompetitions.error) {
    for (const row of orgCompetitions.data ?? []) {
      if (!row.org_id) continue;
      tournamentCounts.set(
        row.org_id,
        (tournamentCounts.get(row.org_id) ?? 0) + 1
      );
    }
  }
  const reviewsByOrgId = new Map<
    string,
    AdminOrganizationRow["organization_verification_reviews"]
  >();
  if (!reviews.error) {
    for (const row of reviews.data ?? []) {
      reviewsByOrgId.set(row.org_id, [
        { note: row.note, reviewed_at: row.reviewed_at },
      ]);
    }
  }

  return (organizations.data ?? []).map((row) => ({
    ...row,
    parent: Array.isArray(row.parent) ? (row.parent[0] ?? null) : row.parent,
    organization_verification_reviews: reviewsByOrgId.get(row.id) ?? [],
    member_count: memberCounts.get(row.id) ?? 0,
    tournament_count: tournamentCounts.get(row.id) ?? 0,
  })) as unknown as AdminOrganizationRow[];
}

export async function getAdminUsers({
  query = "",
  limit = 50,
  offset = 0,
}: {
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  users: AdminUserDirectoryRow[];
  total: number;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_platform_users", {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error("Platform user search failed:", {
      code: error.code,
      message: error.message,
    });
    const missingMigration =
      error.code === "PGRST202" ||
      (error.message.includes("search_platform_users") &&
        error.message.toLowerCase().includes("not found"));
    return {
      users: [],
      total: 0,
      error: missingMigration
        ? "User search is unavailable on this deployment."
        : error.code === "42804"
          ? "User search is unavailable on this deployment."
        : "User search could not be loaded. Check the connection and try again.",
    };
  }
  const users = (data ?? []) as AdminUserDirectoryRow[];
  return {
    users,
    total: Number(users[0]?.total_count ?? 0),
    error: null,
  };
}

export async function getAdminTournaments(
  filters?: AdminTournamentListFilters
): Promise<AdminTournamentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("competitions")
    .select(
      "id, slug, name, category, custom_category_name, participation_mode, organizer_name, venue_name, address, city, state, zip, lat, lng, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations!competitions_org_id_fkey(id, name, slug, state)"
    )
    .order("start_date", { ascending: false })
    .limit(250);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.source && isCompetitionSourceFilter(filters.source)) {
    query = query.eq("source", filters.source);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.q) {
    query = query.ilike("name", `%${escapePostgrestLikePattern(filters.q)}%`);
  }
  if (filters?.state) {
    query = query.eq("state", filters.state);
  }
  if (filters?.mode) {
    query = query.eq("participation_mode", filters.mode);
  }
  if (filters?.audience) {
    query = query.eq("audience", filters.audience);
  }
  if (filters?.timing === "upcoming" || filters?.timing === "ended") {
    const today = todayIsoDate();
    query =
      filters.timing === "upcoming"
        ? query.or(
            `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`
          )
        : query.or(
            `end_date.lt.${today},and(end_date.is.null,start_date.lt.${today})`
          );
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as AdminTournamentRow[];
  if (!filters?.ready) return rows;
  return rows.filter((row) => isTournamentPublishReady(row));
}

export async function getAdminTournamentCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("competitions")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getAdminTournament(
  id: string
): Promise<AdminTournamentRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competitions")
    .select(
      "id, slug, name, category, custom_category_name, participation_mode, organizer_name, venue_name, address, city, state, zip, lat, lng, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations!competitions_org_id_fkey(id, name, slug, state, type, parent_org_id), sections(name, min_rating, max_rating, min_grade, max_grade, entry_fee_cents)"
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as AdminTournamentRow | null) ?? null;
}

export async function getAdminModerationQueue(): Promise<{
  queue: AdminModerationQueueRow[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competitions")
    .select(
      "id, slug, name, category, custom_category_name, participation_mode, organizer_name, venue_name, city, state, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, audience, source, status, submitted_for_review_at, organizations!competitions_org_id_fkey(id, name, slug, verification_status)"
    )
    .eq("status", "pending_review")
    .order("submitted_for_review_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Admin moderation queue failed:", {
      code: error.code,
      message: error.message,
    });
    const detail = error.message?.toLowerCase() ?? "";
    const schemaGap =
      detail.includes("submitted_for_review_at") ||
      detail.includes("verification_status") ||
      detail.includes("does not exist") ||
      error.code === "42703";
    return {
      queue: [],
      error: schemaGap
        ? "Tournament moderation is unavailable on this deployment."
        : "The moderation queue could not be loaded. Try loading it again.",
    };
  }

  return {
    queue: (data ?? []) as unknown as AdminModerationQueueRow[],
    error: null,
  };
}

export async function getAdminAuditLog(limit = 20): Promise<AdminAuditRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AdminAuditRow[];
}

export async function getAdminScrapeRuns(
  limit = 20
): Promise<AdminScrapeRunRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("scrape_runs")
    .select(
      "id, source, started_at, finished_at, status, rows_staged, rows_upserted, error, meta"
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AdminScrapeRunRow[];
}

export async function getAdminIngestionSourceHealth(): Promise<
  AdminIngestionSourceHealth[]
> {
  const runs = await getAdminScrapeRuns(250);
  return INGESTION_SOURCES.filter((source) => source.competitionSource).map(
    (source) => ({
      source,
      health: evaluateSourceOperationalHealth(source, runs),
    })
  );
}
