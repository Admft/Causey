import "server-only";

import type {
  OrgMemberRole,
  OrganizationVerificationStatus,
} from "@/lib/auth/orgs";
import type {
  DistrictPilotReadiness,
  DistrictReadResult,
  DistrictSchoolReadiness,
} from "@/lib/district-readiness";
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

export type DistrictHostedRollup = {
  upcoming_tournaments: number;
  invitations_pending: number;
  going_count: number;
  attended_this_season: number;
};

export type DistrictParticipationReport = {
  schools: DistrictSchoolRollup[];
  districtHosted: DistrictHostedRollup;
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
): Promise<DistrictReadResult<DistrictSchoolRollup[]>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_district_school_rollup", {
    p_district_id: districtId,
  });
  if (error) return { ok: false };
  return { ok: true, data: (data ?? []) as DistrictSchoolRollup[] };
}

export async function getDistrictParticipationReport(
  districtId: string
): Promise<DistrictReadResult<DistrictParticipationReport>> {
  const supabase = await createServerSupabaseClient();
  const [schoolsResult, districtHostedResult] = await Promise.all([
    supabase.rpc("get_district_school_rollup", {
      p_district_id: districtId,
    }),
    supabase.rpc("get_district_hosted_rollup", {
      p_district_id: districtId,
    }),
  ]);
  const districtHosted = districtHostedResult.data?.[0] as
    | DistrictHostedRollup
    | undefined;
  if (schoolsResult.error || districtHostedResult.error || !districtHosted) {
    return { ok: false };
  }
  return {
    ok: true,
    data: {
      schools: (schoolsResult.data ?? []) as DistrictSchoolRollup[],
      districtHosted,
    },
  };
}

type DistrictReadinessOrgRow = {
  id: string;
  name: string;
  slug: string;
  parent_org_id: string | null;
  owner_profile_id: string | null;
  verification_status: OrganizationVerificationStatus;
};

type DistrictReadinessMembershipRow = {
  org_id: string;
  profile_id: string;
  role: OrgMemberRole;
};

export async function getDistrictPilotReadiness(
  districtId: string
): Promise<DistrictReadResult<DistrictPilotReadiness>> {
  const supabase = await createServerSupabaseClient();
  const [districtResult, schoolsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, parent_org_id, owner_profile_id, verification_status"
      )
      .eq("id", districtId)
      .eq("type", "district")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select(
        "id, name, slug, parent_org_id, owner_profile_id, verification_status"
      )
      .eq("parent_org_id", districtId)
      .eq("type", "school")
      .order("name"),
  ]);
  if (districtResult.error || schoolsResult.error) {
    return { ok: false };
  }

  const typedDistrict = districtResult.data as DistrictReadinessOrgRow | null;
  if (!typedDistrict) return { ok: false };
  const typedSchools = (schoolsResult.data ?? []) as DistrictReadinessOrgRow[];
  if (!typedSchools.length) {
    return {
      ok: true,
      data: {
        districtId: typedDistrict.id,
        districtSlug: typedDistrict.slug,
        verificationStatus: typedDistrict.verification_status,
        schools: [],
      },
    };
  }

  const schoolIds = typedSchools.map((school) => school.id);
  const [districtMembershipsResult, schoolMembershipsResult, invitationsResult] =
    await Promise.all([
    supabase
      .from("org_memberships")
      .select("org_id, profile_id, role")
      .eq("org_id", districtId)
      .eq("status", "active")
      .in("role", ["district_admin", "admin"]),
    supabase
      .from("org_memberships")
      .select("org_id, profile_id, role")
      .in("org_id", schoolIds)
      .eq("status", "active"),
    supabase
      .from("org_invitations")
      .select("org_id")
      .in("org_id", schoolIds)
      .eq("role", "school_admin")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);
  if (
    districtMembershipsResult.error ||
    schoolMembershipsResult.error ||
    invitationsResult.error
  ) {
    return { ok: false };
  }
  const districtMemberships = districtMembershipsResult.data;
  const schoolMemberships = schoolMembershipsResult.data;
  const pendingInvitations = invitationsResult.data;

  const districtOperatorIds = new Set<string>();
  if (typedDistrict.owner_profile_id) {
    districtOperatorIds.add(typedDistrict.owner_profile_id);
  }
  for (const row of (districtMemberships ??
    []) as DistrictReadinessMembershipRow[]) {
    districtOperatorIds.add(row.profile_id);
  }

  const membersBySchool = new Map<
    string,
    DistrictReadinessMembershipRow[]
  >();
  for (const row of (schoolMemberships ??
    []) as DistrictReadinessMembershipRow[]) {
    const existing = membersBySchool.get(row.org_id) ?? [];
    existing.push(row);
    membersBySchool.set(row.org_id, existing);
  }
  const pendingBySchool = new Map<string, number>();
  for (const row of pendingInvitations ?? []) {
    const orgId = row.org_id as string;
    pendingBySchool.set(orgId, (pendingBySchool.get(orgId) ?? 0) + 1);
  }

  const readinessSchools: DistrictSchoolReadiness[] = typedSchools.map(
    (school) => {
      const members = membersBySchool.get(school.id) ?? [];
      const delegatedAdmins = members.filter(
        (member) =>
          (member.role === "school_admin" || member.role === "admin") &&
          !districtOperatorIds.has(member.profile_id)
      );
      return {
        id: school.id,
        name: school.name,
        slug: school.slug,
        verificationStatus: school.verification_status,
        activeStudents: members.filter((member) => member.role === "student")
          .length,
        activeDelegatedAdmins: delegatedAdmins.length,
        pendingAdminInvites: pendingBySchool.get(school.id) ?? 0,
        ownershipTransferred: Boolean(
          school.owner_profile_id &&
            delegatedAdmins.some(
              (member) => member.profile_id === school.owner_profile_id
            )
        ),
      };
    }
  );

  return {
    ok: true,
    data: {
      districtId: typedDistrict.id,
      districtSlug: typedDistrict.slug,
      verificationStatus: typedDistrict.verification_status,
      schools: readinessSchools,
    },
  };
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
