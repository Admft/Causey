import "server-only";

import type { AdminTournamentListFilters } from "@/lib/admin-tournament-filters";
import { todayIsoDate } from "@/lib/competition-timing";
import {
  INGESTION_SOURCES,
  evaluateSourceOperationalHealth,
  isCompetitionSourceFilter,
  sourceNeedsOperationalAttention,
  type IngestionSource,
  type SourceHealth,
} from "@/lib/ingestion-sources";
import { escapePostgrestLikePattern } from "@/lib/data/supabase";
import {
  isTournamentPublishReady,
  type TournamentReadinessInput,
} from "@/lib/tournament-readiness";
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
  super_admin: boolean;
  created_at: string;
  total_count: number;
};

export const ADMIN_USER_ACCESS_FILTERS = ["all", "admins"] as const;
export type AdminUserAccessFilter = (typeof ADMIN_USER_ACCESS_FILTERS)[number];

export function parseAdminUserAccess(
  raw?: string | null
): AdminUserAccessFilter {
  return raw === "admins" ? "admins" : "all";
}

export function adminUsersHref(access: AdminUserAccessFilter = "all"): string {
  return access === "admins" ? "/admin/users?access=admins" : "/admin/users";
}

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
  image_url?: string | null;
  details?: { facets?: string[] };
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

/** Exact head count, or null when the query failed (never a fake zero). */
export type AdminCount = number | null;

export const ADMIN_OPS_SLICES = [
  "listings",
  "readyDrafts",
  "organizations",
  "accounts",
  "ingestion",
] as const;

export type AdminOpsSlice = (typeof ADMIN_OPS_SLICES)[number];

export type AdminOpsStats = {
  listings: {
    pendingReview: AdminCount;
    rejected: AdminCount;
    drafts: AdminCount;
    published: AdminCount;
    archived: AdminCount;
    readyToPublish: AdminCount;
    publishedOrganizer: AdminCount;
  };
  organizations: {
    total: AdminCount;
    pending: AdminCount;
    rejected: AdminCount;
    verified: AdminCount;
    districts: AdminCount;
  };
  accounts: {
    total: AdminCount;
    platformAdmins: AdminCount;
  };
  ingestion: {
    lastRunStatus: AdminScrapeRunRow["status"] | null;
    lastRunAt: string | null;
    lastRowsUpserted: number | null;
    issueCount: AdminCount;
    runsUnavailable: boolean;
  };
};

const UNAVAILABLE_LISTINGS: AdminOpsStats["listings"] = {
  pendingReview: null,
  rejected: null,
  drafts: null,
  published: null,
  archived: null,
  readyToPublish: null,
  publishedOrganizer: null,
};

const UNAVAILABLE_ORGANIZATIONS: AdminOpsStats["organizations"] = {
  total: null,
  pending: null,
  rejected: null,
  verified: null,
  districts: null,
};

const UNAVAILABLE_ACCOUNTS: AdminOpsStats["accounts"] = {
  total: null,
  platformAdmins: null,
};

const UNAVAILABLE_INGESTION: AdminOpsStats["ingestion"] = {
  lastRunStatus: null,
  lastRunAt: null,
  lastRowsUpserted: null,
  issueCount: null,
  runsUnavailable: true,
};

export function formatIngestionLastRun(
  lastRunStatus: AdminScrapeRunRow["status"] | null,
  runsUnavailable: boolean
): string | null {
  if (runsUnavailable) return null;
  if (!lastRunStatus) return "None yet";
  if (lastRunStatus === "succeeded") return "Succeeded";
  if (lastRunStatus === "failed") return "Failed";
  return "Running";
}

type CountQuery = PromiseLike<{
  count: number | null;
  error: { message: string; code?: string } | null;
}>;

function logAdminCountFailure(error: unknown) {
  const record =
    error && typeof error === "object"
      ? (error as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        })
      : null;
  console.error("Admin ops count failed:", {
    code: record?.code ?? null,
    message: record?.message || (error == null ? null : String(error)),
    details: record?.details ?? null,
    hint: record?.hint ?? null,
  });
}

function isMissingAdminRpc(
  error: { code?: string; message?: string } | null,
  fn: string
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    (message.includes(fn) &&
      (message.includes("not found") || message.includes("could not find")))
  );
}

async function exactCount(query: CountQuery): Promise<AdminCount> {
  const { count, error } = await query;
  if (error) {
    logAdminCountFailure(error);
    return null;
  }
  return count ?? 0;
}

async function countPlatformAdminsFromDirectory(): Promise<AdminCount> {
  const pageSize = 100;
  const maxPages = 20;
  let offset = 0;
  let counted = 0;
  let total = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await getAdminUsers({
      query: "",
      limit: pageSize,
      offset,
    });
    if (result.error) return null;
    total = result.total;
    counted += result.users.filter((user) => user.platform_admin).length;
    offset += pageSize;
    if (result.users.length === 0 || offset >= total) {
      return counted;
    }
  }

  return null;
}

export async function countPlatformAdmins(): Promise<AdminCount> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("count_platform_admins");
  if (!error) {
    const n = Number(data);
    return Number.isFinite(n) ? n : 0;
  }

  // Table grants are revoked (0015). Until 0071 is applied, count from the
  // directory RPC that already loads each admin flag.
  const fromDirectory = await countPlatformAdminsFromDirectory();
  if (fromDirectory !== null) return fromDirectory;

  logAdminCountFailure(error);
  return null;
}

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

export async function getAdminOpsStats(
  slices: readonly AdminOpsSlice[]
): Promise<AdminOpsStats> {
  const supabase = await createServerSupabaseClient();
  const includeListings = slices.includes("listings");
  const includeReadyDrafts = slices.includes("readyDrafts");
  const includeOrganizations = slices.includes("organizations");
  const includeAccounts = slices.includes("accounts");
  const includeIngestion = slices.includes("ingestion");

  const listing = (status: AdminTournamentRow["status"]) =>
    exactCount(
      supabase
        .from("competitions")
        .select("*", { count: "exact", head: true })
        .eq("status", status)
    );
  const orgStatus = (
    verificationStatus: AdminOrganizationRow["verification_status"]
  ) =>
    exactCount(
      supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", verificationStatus)
    );

  const [listingBundle, draftRows, orgBundle, accountBundle, scrapeRuns] =
    await Promise.all([
      includeListings
        ? Promise.all([
            listing("pending_review"),
            listing("rejected"),
            listing("draft"),
            listing("published"),
            listing("archived"),
            exactCount(
              supabase
                .from("competitions")
                .select("*", { count: "exact", head: true })
                .eq("status", "published")
                .eq("source", "organizer")
            ),
          ])
        : Promise.resolve(null),
      includeReadyDrafts
        ? supabase
            .from("competitions")
            .select(
              "name, start_date, city, state, zip, lat, lng, reg_url, participation_mode"
            )
            .eq("status", "draft")
            .limit(1000)
        : Promise.resolve(null),
      includeOrganizations
        ? Promise.all([
            exactCount(
              supabase
                .from("organizations")
                .select("*", { count: "exact", head: true })
            ),
            orgStatus("pending"),
            orgStatus("rejected"),
            orgStatus("verified"),
            exactCount(
              supabase
                .from("organizations")
                .select("*", { count: "exact", head: true })
                .eq("type", "district")
            ),
          ])
        : Promise.resolve(null),
      includeAccounts
        ? Promise.all([countPlatformAdmins(), getAdminUsers({ limit: 1 })])
        : Promise.resolve(null),
      includeIngestion
        ? supabase
            .from("scrape_runs")
            .select(
              "id, source, started_at, finished_at, status, rows_staged, rows_upserted, error, meta"
            )
            .order("started_at", { ascending: false })
            .limit(250)
        : Promise.resolve(null),
    ]);

  let readyToPublish: AdminCount = null;
  if (draftRows) {
    if (draftRows.error) {
      console.error("Admin ready-draft count failed:", draftRows.error);
    } else {
      readyToPublish = (
        (draftRows.data ?? []) as TournamentReadinessInput[]
      ).filter((row) => isTournamentPublishReady(row)).length;
    }
  }

  const listings: AdminOpsStats["listings"] = listingBundle
    ? {
        pendingReview: listingBundle[0],
        rejected: listingBundle[1],
        drafts: listingBundle[2],
        published: listingBundle[3],
        archived: listingBundle[4],
        readyToPublish,
        publishedOrganizer: listingBundle[5],
      }
    : { ...UNAVAILABLE_LISTINGS, readyToPublish };

  const organizations = orgBundle
    ? {
        total: orgBundle[0],
        pending: orgBundle[1],
        rejected: orgBundle[2],
        verified: orgBundle[3],
        districts: orgBundle[4],
      }
    : UNAVAILABLE_ORGANIZATIONS;

  const accounts = accountBundle
    ? {
        total: accountBundle[1].error ? null : accountBundle[1].total,
        platformAdmins: accountBundle[0],
      }
    : UNAVAILABLE_ACCOUNTS;

  let ingestion = UNAVAILABLE_INGESTION;
  if (scrapeRuns) {
    const runsUnavailable = Boolean(scrapeRuns.error);
    if (scrapeRuns.error) {
      console.error("Admin scrape runs failed:", scrapeRuns.error);
    }
    const runs = (scrapeRuns.data ?? []) as AdminScrapeRunRow[];
    const lastRun = runs[0] ?? null;
    const health = runsUnavailable
      ? null
      : INGESTION_SOURCES.filter((source) => source.competitionSource).map(
          (source) => ({
            source,
            health: evaluateSourceOperationalHealth(source, runs),
          })
        );
    const issueCount = health
      ? health.filter(({ source, health: sourceHealth }) =>
          sourceNeedsOperationalAttention(source, sourceHealth)
        ).length
      : null;
    ingestion = {
      lastRunStatus: lastRun?.status ?? null,
      lastRunAt: lastRun?.started_at ?? null,
      lastRowsUpserted:
        runsUnavailable || !lastRun ? null : lastRun.rows_upserted,
      issueCount,
      runsUnavailable,
    };
  }

  return {
    listings,
    organizations,
    accounts,
    ingestion,
  };
}

/** @deprecated Prefer getAdminOpsStats — kept for a fail-open numeric snapshot. */
export async function getAdminOverview() {
  const stats = await getAdminOpsStats(["listings", "organizations"]);
  return {
    organizations: stats.organizations.total ?? 0,
    drafts: stats.listings.drafts ?? 0,
    pendingReview: stats.listings.pendingReview ?? 0,
    published: stats.listings.published ?? 0,
    archived: stats.listings.archived ?? 0,
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

function mapAdminDirectoryUsers(
  data: AdminUserDirectoryRow[] | null
): AdminUserDirectoryRow[] {
  return ((data ?? []) as AdminUserDirectoryRow[]).map((user) => ({
    ...user,
    super_admin: Boolean(user.super_admin),
    platform_admin: Boolean(user.platform_admin),
  }));
}

function platformUserSearchError(error: {
  code?: string;
  message?: string;
}): string {
  if (isMissingAdminRpc(error, "search_platform_users") || error.code === "42804") {
    return "User search is unavailable on this deployment.";
  }
  return "User search could not be loaded. Check the connection and try again.";
}

async function searchPlatformUsersRpc({
  query,
  limit,
  offset,
  access = "all",
}: {
  query: string;
  limit: number;
  offset: number;
  access?: AdminUserAccessFilter;
}): Promise<{
  users: AdminUserDirectoryRow[];
  total: number;
  error: string | null;
  missingFunction: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const args: {
    p_query: string;
    p_limit: number;
    p_offset: number;
    p_access?: string;
  } = {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  };
  if (access === "admins") {
    args.p_access = "admins";
  }
  const { data, error } = await supabase.rpc("search_platform_users", args);
  if (error) {
    console.error("Platform user search failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      users: [],
      total: 0,
      error: platformUserSearchError(error),
      missingFunction: isMissingAdminRpc(error, "search_platform_users"),
    };
  }
  const users = mapAdminDirectoryUsers(data as AdminUserDirectoryRow[] | null);
  return {
    users,
    total: Number(users[0]?.total_count ?? 0),
    error: null,
    missingFunction: false,
  };
}

async function collectAdminUsersFromUnfilteredDirectory({
  query,
  limit,
  offset,
}: {
  query: string;
  limit: number;
  offset: number;
}): Promise<{
  users: AdminUserDirectoryRow[];
  total: number;
  error: string | null;
}> {
  const pageSize = 100;
  const maxPages = 20;
  const matched: AdminUserDirectoryRow[] = [];
  let scanned = 0;
  let directoryTotal = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await searchPlatformUsersRpc({
      query,
      limit: pageSize,
      offset: scanned,
    });
    if (result.error) {
      return { users: [], total: 0, error: result.error };
    }
    directoryTotal = result.total;
    matched.push(...result.users.filter((user) => user.platform_admin));
    scanned += pageSize;
    if (result.users.length === 0 || scanned >= directoryTotal) {
      break;
    }
  }

  const page = matched.slice(offset, offset + limit).map((user) => ({
    ...user,
    total_count: matched.length,
  }));
  return { users: page, total: matched.length, error: null };
}

export async function getAdminUsers({
  query = "",
  limit = 50,
  offset = 0,
  access = "all",
}: {
  query?: string;
  limit?: number;
  offset?: number;
  access?: AdminUserAccessFilter;
}): Promise<{
  users: AdminUserDirectoryRow[];
  total: number;
  error: string | null;
}> {
  const result = await searchPlatformUsersRpc({
    query,
    limit,
    offset,
    access,
  });
  if (!result.error) {
    return { users: result.users, total: result.total, error: null };
  }
  if (access === "admins" && result.missingFunction) {
    return collectAdminUsersFromUnfilteredDirectory({
      query,
      limit,
      offset,
    });
  }
  return { users: [], total: 0, error: result.error };
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
  if (filters?.ready === true) {
    return rows.filter((row) => isTournamentPublishReady(row));
  }
  if (filters?.ready === false) {
    return rows.filter((row) => !isTournamentPublishReady(row));
  }
  return rows;
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
      "id, slug, name, category, custom_category_name, participation_mode, organizer_name, venue_name, address, city, state, zip, lat, lng, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, image_url, org_id, created_at, updated_at, details, organizations!competitions_org_id_fkey(id, name, slug, state, type, parent_org_id), sections(name, min_rating, max_rating, min_grade, max_grade, entry_fee_cents)"
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

export async function getAdminScrapeRuns(limit = 20): Promise<{
  runs: AdminScrapeRunRow[];
  unavailable: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scrape_runs")
    .select(
      "id, source, started_at, finished_at, status, rows_staged, rows_upserted, error, meta"
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Admin scrape runs failed:", {
      code: error.code,
      message: error.message,
    });
    return { runs: [], unavailable: true };
  }

  return {
    runs: (data ?? []) as AdminScrapeRunRow[],
    unavailable: false,
  };
}

export async function getAdminIngestionSourceHealth(): Promise<{
  sources: AdminIngestionSourceHealth[];
  unavailable: boolean;
}> {
  const { runs, unavailable } = await getAdminScrapeRuns(250);
  if (unavailable) return { sources: [], unavailable: true };
  return {
    sources: INGESTION_SOURCES.filter((source) => source.competitionSource).map(
      (source) => ({
        source,
        health: evaluateSourceOperationalHealth(source, runs),
      })
    ),
    unavailable: false,
  };
}
