import "server-only";

import type {
  OrgMemberRole,
  OrganizationVerificationStatus,
} from "@/lib/auth/orgs";
import type { AttentionSourceEvent } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DistrictSchoolRollup = {
  school_id: string;
  school_name: string;
  active_students: number;
  upcoming_tournaments: number;
  invitations_pending: number;
  going_count: number;
  attended_this_season: number;
};

export type OrgInvitationRow = {
  id: string;
  org_id: string;
  email: string;
  display_name: string | null;
  role: OrgMemberRole;
  status: "pending" | "claimed" | "revoked" | "expired";
  expires_at: string;
  claimed_at: string | null;
  created_at: string;
};

export type NotificationPreferenceRow = {
  invitation: boolean;
  registration_deadline: boolean;
  reminder_7_day: boolean;
  reminder_1_day: boolean;
  schedule_change: boolean;
  cancellation: boolean;
  rsvp_update: boolean;
  announcement: boolean;
  email_enabled: boolean;
  guardian_routing: boolean;
  timezone: string;
};

export type OrgSeasonAttendanceRow = {
  competition_id: string;
  profile_id: string;
  status: "attended" | "did_not_attend";
  attendance_marked_at: string | null;
  competitions: {
    slug: string;
    name: string;
    start_date: string;
  } | null;
  profiles: {
    display_name: string;
  } | null;
};

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type ModerationQueueRow = {
  id: string;
  slug: string;
  name: string;
  audience: "public" | "district" | "school" | "invite_only";
  status: "pending_review";
  submitted_for_review_at: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    verification_status: OrganizationVerificationStatus;
  } | null;
};

export async function getDistrictSchoolRollup(
  districtId: string
): Promise<DistrictSchoolRollup[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_district_school_rollup", {
    p_district_id: districtId,
  });
  if (error) return [];
  return (data ?? []) as DistrictSchoolRollup[];
}

export async function getOrgInvitations(
  orgId: string
): Promise<OrgInvitationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("org_invitations")
    .select(
      "id, org_id, email, display_name, role, status, expires_at, claimed_at, created_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(250);
  return (data ?? []) as OrgInvitationRow[];
}

export async function getOrgSeasonAttendance(
  orgId: string
): Promise<OrgSeasonAttendanceRow[]> {
  const supabase = await createServerSupabaseClient();
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const { data } = await supabase
    .from("competition_entrants")
    .select(
      "competition_id, profile_id, status, attendance_marked_at, competitions!inner(slug, name, start_date, org_id), profiles(display_name)"
    )
    .eq("competitions.org_id", orgId)
    .gte("competitions.start_date", startOfYear)
    .in("status", ["attended", "did_not_attend"])
    .order("attendance_marked_at", { ascending: false });
  return (data ?? []) as unknown as OrgSeasonAttendanceRow[];
}

export async function getNotificationPreferences(
  profileId: string
): Promise<NotificationPreferenceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(
      "invitation, registration_deadline, reminder_7_day, reminder_1_day, schedule_change, cancellation, rsvp_update, announcement, email_enabled, guardian_routing, timezone"
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as NotificationPreferenceRow | null) ?? null;
}

export async function getNotifications(
  profileId: string,
  limit = 20
): Promise<NotificationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("recipient_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadNotificationCount(
  profileId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profileId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

type CompetitionLite = {
  id: string;
  slug: string;
  name: string;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
};

/** Raw relations used to build live attention items on /me/notifications. */
export async function getAttentionSourceEvents(
  profileId: string
): Promise<AttentionSourceEvent[]> {
  const supabase = await createServerSupabaseClient();
  const [
    { data: entrantRows },
    { data: savedRows },
    { data: registrationRows },
  ] = await Promise.all([
    supabase
      .from("competition_entrants")
      .select(
        "competition_id, status, competitions(id, slug, name, start_date, end_date, reg_deadline, reg_url)"
      )
      .eq("profile_id", profileId)
      .in("status", ["invited", "going"]),
    supabase
      .from("saved_competitions")
      .select(
        "competition_id, competitions(id, slug, name, start_date, end_date, reg_deadline, reg_url)"
      )
      .eq("user_id", profileId),
    supabase
      .from("external_registrations")
      .select(
        "competition_id, status, competitions(id, slug, name, start_date, end_date, reg_deadline, reg_url)"
      )
      .eq("user_id", profileId)
      .in("status", ["opened", "not_registered"]),
  ]);

  const events: AttentionSourceEvent[] = [];

  for (const row of entrantRows ?? []) {
    const competition = row.competitions as unknown as CompetitionLite | null;
    if (!competition) continue;
    const status = row.status as "invited" | "going";
    events.push({
      competitionId: competition.id,
      slug: competition.slug,
      name: competition.name,
      startDate: competition.start_date,
      endDate: competition.end_date,
      regDeadline: competition.reg_deadline,
      regUrl: competition.reg_url,
      relation: status,
    });
  }

  for (const row of savedRows ?? []) {
    const competition = row.competitions as unknown as CompetitionLite | null;
    if (!competition) continue;
    events.push({
      competitionId: competition.id,
      slug: competition.slug,
      name: competition.name,
      startDate: competition.start_date,
      endDate: competition.end_date,
      regDeadline: competition.reg_deadline,
      regUrl: competition.reg_url,
      relation: "saved",
    });
  }

  for (const row of registrationRows ?? []) {
    const competition = row.competitions as unknown as CompetitionLite | null;
    if (!competition) continue;
    events.push({
      competitionId: competition.id,
      slug: competition.slug,
      name: competition.name,
      startDate: competition.start_date,
      endDate: competition.end_date,
      regDeadline: competition.reg_deadline,
      regUrl: competition.reg_url,
      relation:
        row.status === "opened"
          ? "registration_opened"
          : "registration_needed",
    });
  }

  return events;
}

export async function getModerationQueue(): Promise<ModerationQueueRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competitions")
    .select(
      "id, slug, name, audience, status, submitted_for_review_at, organizations!competitions_org_id_fkey(id, name, slug, verification_status)"
    )
    .eq("status", "pending_review")
    .order("submitted_for_review_at", { ascending: true });
  return (data ?? []) as unknown as ModerationQueueRow[];
}
