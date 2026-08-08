import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  type: "school" | "district" | "club" | "team";
  state: string | null;
  created_at: string;
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
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  city: string;
  state: string;
  zip: string;
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
  } | null;
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

export type AdminModerationQueueRow = {
  id: string;
  slug: string;
  name: string;
  organizer_name: string | null;
  venue_name: string | null;
  city: string;
  state: string;
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
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug, type, state, created_at")
    .order("type")
    .order("name");

  return (data ?? []) as AdminOrganizationRow[];
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
    return {
      users: [],
      total: 0,
      error:
        "User search is unavailable until migration 0026 is applied.",
    };
  }
  const users = (data ?? []) as AdminUserDirectoryRow[];
  return {
    users,
    total: Number(users[0]?.total_count ?? 0),
    error: null,
  };
}

export async function getAdminTournaments(filters?: {
  status?: string;
  source?: string;
}): Promise<AdminTournamentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("competitions")
    .select(
      "id, slug, name, organizer_name, venue_name, address, city, state, zip, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations!competitions_org_id_fkey(id, name, slug, state)"
    )
    .order("start_date", { ascending: false })
    .limit(250);

  if (
    filters?.status &&
    ["draft", "pending_review", "published", "rejected", "archived"].includes(
      filters.status
    )
  ) {
    query = query.eq("status", filters.status);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  const { data } = await query;
  return (data ?? []) as unknown as AdminTournamentRow[];
}

export async function getAdminTournament(
  id: string
): Promise<AdminTournamentRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competitions")
    .select(
      "id, slug, name, organizer_name, venue_name, address, city, state, zip, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations!competitions_org_id_fkey(id, name, slug, state)"
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
      "id, slug, name, organizer_name, venue_name, city, state, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, audience, source, status, submitted_for_review_at, organizations!competitions_org_id_fkey(id, name, slug, verification_status)"
    )
    .eq("status", "pending_review")
    .order("submitted_for_review_at", { ascending: true, nullsFirst: false });

  if (error) {
    const detail = error.message?.toLowerCase() ?? "";
    const schemaGap =
      detail.includes("submitted_for_review_at") ||
      detail.includes("verification_status") ||
      detail.includes("does not exist") ||
      error.code === "42703";
    return {
      queue: [],
      error: schemaGap
        ? "Moderation columns aren’t set up yet. Apply migration 0024_moderation_queue_columns.sql, then reload."
        : `The moderation queue could not be loaded${
            error.code ? ` (${error.code})` : ""
          }. Try loading it again.`,
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
