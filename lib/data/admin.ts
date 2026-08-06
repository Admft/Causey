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

export async function getAdminTournaments(filters?: {
  status?: string;
  source?: string;
}): Promise<AdminTournamentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("competitions")
    .select(
      "id, slug, name, organizer_name, venue_name, address, city, state, zip, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations(id, name, slug, state)"
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
      "id, slug, name, organizer_name, venue_name, address, city, state, zip, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, visibility, audience, source, status, org_id, created_at, updated_at, organizations(id, name, slug, state)"
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
      "id, slug, name, organizer_name, venue_name, city, state, start_date, end_date, reg_deadline, reg_url, entry_fee_cents, rated, audience, source, status, submitted_for_review_at, organizations(id, name, slug, verification_status)"
    )
    .eq("status", "pending_review")
    .order("submitted_for_review_at", { ascending: true });

  if (error) {
    return {
      queue: [],
      error: "The moderation queue could not be loaded.",
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
