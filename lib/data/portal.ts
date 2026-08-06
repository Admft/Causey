import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AttendanceRow,
  CompetitionAudience,
  CompetitionEntrant,
  EntrantStatus,
  Organization,
  OrgGroup,
  OrgMemberRole,
  OrgMembership,
  RosterRow,
} from "@/lib/auth/orgs";
import type { CompetitionDetail } from "@/lib/data/types";
import {
  CompetitionSchema,
  SectionSchema,
  SeriesSchema,
  TournamentDraftDataSchema,
  type TournamentDraftData,
} from "@/lib/schemas";

/**
 * Portal reads. These deliberately bypass lib/data (the anon DataSource):
 * org/private rows are only visible to the signed-in user, so every query
 * here runs on the cookie-aware server client and RLS scopes the results.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export type OrgEventRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string | null;
  visibility: "public" | "private";
  audience: CompetitionAudience;
  entry_fee_cents: number | null;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
};

export type OrgAnnouncementRow = {
  id: string;
  org_id: string;
  title: string;
  body: string;
  published_at: string;
  archived_at: string | null;
};

export type DistrictSchoolRow = Pick<
  Organization,
  "id" | "name" | "slug" | "state" | "verification_status"
>;

export type TournamentDraftRow = {
  id: string;
  org_id: string;
  created_by: string;
  data: TournamentDraftData;
  cover_image_url: string | null;
  cover_image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type MyOrgRow = {
  org: Organization;
  memberRole: OrgMemberRole | null;
  isCoach: boolean;
};

export type OrgForViewer = {
  org: Organization;
  membership: OrgMembership | null;
  isCoach: boolean;
  isAdmin: boolean;
  isDistrictAdmin: boolean;
  activeMemberCount: number;
  events: OrgEventRow[];
  drafts: TournamentDraftRow[];
  schools: DistrictSchoolRow[];
  announcements: OrgAnnouncementRow[];
};

export type EntrantWithEvent = {
  competition_id: string;
  profile_id: string;
  status: EntrantStatus;
  responded_by: string | null;
  competition: Pick<
    OrgEventRow,
    "slug" | "name" | "city" | "state" | "start_date" | "end_date"
  > | null;
};

export type GroupWithMembers = OrgGroup & { member_ids: string[] };

function coachOf(org: Organization, membership: OrgMembership | null, userId: string) {
  return (
    org.owner_profile_id === userId ||
    org.created_by === userId ||
    (membership?.status === "active" &&
      [
        "assistant_coach",
        "coach",
        "school_admin",
        "district_admin",
      ].includes(membership.role))
  );
}

function adminOf(org: Organization, membership: OrgMembership | null, userId: string) {
  return (
    org.owner_profile_id === userId ||
    org.created_by === userId ||
    (membership?.status === "active" &&
      (membership.role === "school_admin" ||
        membership.role === "district_admin"))
  );
}

/** Events that haven't finished yet come first; the past is history. */
export function isUpcomingEvent(
  row: { start_date: string; end_date: string | null },
  todayIso: string
): boolean {
  return (row.end_date ?? row.start_date) >= todayIso;
}

export async function getMyOrgs(userId: string): Promise<MyOrgRow[]> {
  const supabase = await createServerSupabaseClient();
  const [membershipRes, createdRes] = await Promise.all([
    supabase
      .from("org_memberships")
      .select("role, status, organizations(*)")
      .eq("profile_id", userId)
      .eq("status", "active"),
    supabase.from("organizations").select("*").eq("created_by", userId),
  ]);

  const rows = new Map<string, MyOrgRow>();
  for (const org of (createdRes.data ?? []) as unknown as Organization[]) {
    rows.set(org.id, { org, memberRole: null, isCoach: true });
  }
  for (const row of membershipRes.data ?? []) {
    const org = row.organizations as unknown as Organization | null;
    if (!org) continue;
    const memberRole = row.role as OrgMemberRole;
    const existing = rows.get(org.id);
    rows.set(org.id, {
      org,
      memberRole,
      isCoach:
        existing?.isCoach ||
        [
          "assistant_coach",
          "coach",
          "school_admin",
          "district_admin",
        ].includes(memberRole),
    });
  }
  return [...rows.values()].sort((a, b) => a.org.name.localeCompare(b.org.name));
}

export async function getOrgBySlugForViewer(
  slug: string,
  userId: string
): Promise<OrgForViewer | null> {
  const supabase = await createServerSupabaseClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;

  const [membershipRes, countRes, eventsRes, draftsRes, schoolsRes, announcementsRes] =
    await Promise.all([
    supabase
      .from("org_memberships")
      .select("*")
      .eq("org_id", org.id)
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("org_memberships")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("status", "active"),
    supabase
      .from("competitions")
      .select(
        "id, slug, name, city, state, start_date, end_date, visibility, audience, entry_fee_cents, status"
      )
      .eq("org_id", org.id)
      // Drafts are included so an organizer can find and publish them. RLS
      // only returns them to the creator and the org's coaches.
      .in("status", ["draft", "pending_review", "published", "rejected"])
      .order("start_date", { ascending: true }),
    supabase
      .from("tournament_drafts")
      .select(
        "id, org_id, created_by, data, cover_image_url, cover_image_path, created_at, updated_at"
      )
      .eq("org_id", org.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name, slug, state, verification_status")
      .eq("parent_org_id", org.id)
      .eq("type", "school")
      .order("name"),
    supabase
      .from("org_announcements")
      .select("id, org_id, title, body, published_at, archived_at")
      .eq("org_id", org.id)
      .is("archived_at", null)
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  const membership = (membershipRes.data as OrgMembership | null) ?? null;
  const drafts = (draftsRes.data ?? []).flatMap((row) => {
    const parsed = TournamentDraftDataSchema.safeParse(row.data);
    return parsed.success
      ? [
          {
            ...row,
            data: parsed.data,
          } as TournamentDraftRow,
        ]
      : [];
  });
  const typedOrg = org as Organization;
  const isAdmin = adminOf(typedOrg, membership, userId);
  return {
    org: typedOrg,
    membership,
    isCoach: coachOf(typedOrg, membership, userId),
    isAdmin,
    isDistrictAdmin:
      typedOrg.type === "district" &&
      isAdmin &&
      (membership?.role === "district_admin" ||
        typedOrg.owner_profile_id === userId ||
        typedOrg.created_by === userId),
    activeMemberCount: countRes.count ?? 0,
    events: (eventsRes.data ?? []) as OrgEventRow[],
    drafts,
    schools: (schoolsRes.data ?? []) as DistrictSchoolRow[],
    announcements: (announcementsRes.data ?? []) as OrgAnnouncementRow[],
  };
}

/** One resumable draft, with RLS limiting reads to coaches of its organization. */
export async function getTournamentDraftForViewer(
  draftId: string,
  orgId: string
): Promise<TournamentDraftRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("tournament_drafts")
    .select(
      "id, org_id, created_by, data, cover_image_url, cover_image_path, created_at, updated_at"
    )
    .eq("id", draftId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return null;
  const draftData = TournamentDraftDataSchema.safeParse(data.data);
  if (!draftData.success) return null;
  return {
    ...data,
    data: draftData.data,
  } as TournamentDraftRow;
}

export async function getMyEntrantRows(
  userId: string
): Promise<EntrantWithEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competition_entrants")
    .select(
      "competition_id, profile_id, status, responded_by, competitions(slug, name, city, state, start_date, end_date)"
    )
    .eq("profile_id", userId);

  const rows = (data ?? []).map((row) => ({
    competition_id: row.competition_id as string,
    profile_id: row.profile_id as string,
    status: row.status as EntrantStatus,
    responded_by: row.responded_by as string | null,
    competition:
      (row.competitions as unknown as EntrantWithEvent["competition"]) ?? null,
  }));
  return rows.sort((a, b) =>
    (a.competition?.start_date ?? "").localeCompare(
      b.competition?.start_date ?? ""
    )
  );
}

/**
 * Cookie-aware fallback for /event/[slug]: the anon DataSource can't see
 * private org events, so when its lookup misses we retry as the viewer and
 * let RLS decide. Same parse as SupabaseDataSource.getCompetitionBySlug.
 */
export async function getCompetitionBySlugAuthed(
  slug: string
): Promise<CompetitionDetail | null> {
  if (!isSupabaseConfigured()) return null; // mock mode: nothing to fall back to
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competitions")
    .select("*, sections(*), series(*)")
    .eq("slug", slug)
    // Drafts are included so organizers can preview and publish; RLS restricts
    // them to the creator and org coaches. Archived stays hidden.
    .in("status", ["draft", "published"])
    .maybeSingle();
  if (error || !data || data.canonical_id) return null;

  const { sections: rawSections, series: rawSeries, ...rawComp } = data;
  const parsed = CompetitionSchema.safeParse(rawComp);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    sections: (rawSections ?? []).flatMap((s: unknown) => {
      const section = SectionSchema.safeParse(s);
      return section.success ? [section.data] : [];
    }),
    series: rawSeries ? SeriesSchema.parse(rawSeries) : null,
  };
}

/** Can the viewer manage this competition (creator or coach of its org)? */
export async function canManageCompetitionAsViewer(
  competition: Pick<CompetitionDetail, "created_by" | "org_id">,
  userId: string
): Promise<boolean> {
  if (competition.created_by === userId) return true;
  if (!competition.org_id) return false;
  const supabase = await createServerSupabaseClient();
  const [orgRes, membershipRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("created_by")
      .eq("id", competition.org_id)
      .maybeSingle(),
    supabase
      .from("org_memberships")
      .select("role, status")
      .eq("org_id", competition.org_id)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);
  if (orgRes.data?.created_by === userId) return true;
  const m = membershipRes.data;
  return Boolean(
    m && m.status === "active" && (m.role === "coach" || m.role === "admin")
  );
}

export async function getEventAttendance(
  competitionId: string
): Promise<AttendanceRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_event_attendance", {
    p_competition_id: competitionId,
  });
  if (error) return [];
  return (data ?? []) as AttendanceRow[];
}

/** Actively linked children with their display names (parent viewers). */
export async function getActiveChildren(
  userId: string
): Promise<{ profile_id: string; display_name: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("household_links")
    .select("child_profile_id, profiles!household_links_child_profile_id_fkey(display_name)")
    .eq("parent_profile_id", userId)
    .eq("status", "active");
  return (data ?? []).map((row) => ({
    profile_id: row.child_profile_id as string,
    display_name:
      ((row.profiles as unknown as { display_name: string } | null)
        ?.display_name ?? "") || "Your student",
  }));
}

/** Entrant rows on one competition for a set of profiles (self + children). */
export async function getEntrantsForCompetition(
  competitionId: string,
  profileIds: string[]
): Promise<CompetitionEntrant[]> {
  if (!profileIds.length) return [];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competition_entrants")
    .select("*")
    .eq("competition_id", competitionId)
    .in("profile_id", profileIds);
  return (data ?? []) as CompetitionEntrant[];
}

/**
 * Roster via the get_org_roster RPC — the only roster path, so coaches
 * never see more than display_name + age_band (no DOB/zip/email).
 */
export async function getOrgRoster(orgId: string): Promise<RosterRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_org_roster", {
    p_org_id: orgId,
  });
  if (error) return [];
  return (data ?? []) as RosterRow[];
}

export type RecommendTarget = {
  profile_id: string;
  display_name: string;
  context: string; // "Your child" or the org name
};

/**
 * Who the viewer can recommend an event to: linked children plus everyone
 * on the rosters of orgs they belong to or coach. Names come from the
 * PII-light roster RPC / household reads.
 */
export async function getRecommendTargets(
  userId: string
): Promise<RecommendTarget[]> {
  const [children, myOrgs] = await Promise.all([
    getActiveChildren(userId),
    getMyOrgs(userId),
  ]);
  const targets = new Map<string, RecommendTarget>();
  for (const child of children) {
    targets.set(child.profile_id, {
      profile_id: child.profile_id,
      display_name: child.display_name,
      context: "Your child",
    });
  }
  const rosters = await Promise.all(
    myOrgs.map(async ({ org }) => ({
      org,
      roster: await getOrgRoster(org.id),
    }))
  );
  for (const { org, roster } of rosters) {
    for (const row of roster) {
      if (row.profile_id === userId || row.member_status !== "active") continue;
      if (!targets.has(row.profile_id)) {
        targets.set(row.profile_id, {
          profile_id: row.profile_id,
          display_name: row.display_name || "Unnamed student",
          context: org.name,
        });
      }
    }
  }
  return [...targets.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  );
}

export type RecommendationRow = {
  id: string;
  competition_id: string;
  from_name: string;
  note: string | null;
  created_at: string;
  competition: Pick<
    OrgEventRow,
    "slug" | "name" | "city" | "state" | "start_date" | "end_date"
  > | null;
};

/** Recommendations sent to the viewer, sender names resolved via RPC. */
export async function getMyRecommendations(
  userId: string
): Promise<RecommendationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("event_recommendations")
    .select(
      "id, competition_id, from_profile_id, note, created_at, competitions(slug, name, city, state, start_date, end_date)"
    )
    .eq("to_profile_id", userId)
    .eq("status", "sent")
    .order("created_at", { ascending: false });
  const rows = (data ?? []).filter((row) => row.competitions);
  if (!rows.length) return [];

  const senderIds = [...new Set(rows.map((row) => row.from_profile_id as string))];
  const { data: names } = await supabase.rpc("get_connected_names", {
    p_ids: senderIds,
  });
  const nameById = new Map(
    ((names ?? []) as { profile_id: string; display_name: string }[]).map(
      (row) => [row.profile_id, row.display_name]
    )
  );

  return rows.map((row) => ({
    id: row.id as string,
    competition_id: row.competition_id as string,
    from_name: nameById.get(row.from_profile_id as string) || "Someone you know",
    note: (row.note as string | null) ?? null,
    created_at: row.created_at as string,
    competition:
      (row.competitions as unknown as RecommendationRow["competition"]) ?? null,
  }));
}

export type RatingSummary = { avg_score: number; rating_count: number };

export async function getRatingSummary(
  competitionId: string
): Promise<RatingSummary | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_rating_summary", {
    p_competition_id: competitionId,
  });
  if (error || !data?.length || !data[0].rating_count) return null;
  return {
    avg_score: Number(data[0].avg_score),
    rating_count: data[0].rating_count as number,
  };
}

export type ClubGoingGroup = { org_name: string; names: string[] };

/** Teammates from the viewer's orgs who RSVP'd going, grouped by org. */
export async function getClubGoing(
  competitionId: string
): Promise<ClubGoingGroup[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_club_going", {
    p_competition_id: competitionId,
  });
  if (error) return [];
  const groups = new Map<string, string[]>();
  for (const row of (data ?? []) as { org_name: string; display_name: string }[]) {
    const list = groups.get(row.org_name) ?? [];
    list.push(row.display_name || "Unnamed student");
    groups.set(row.org_name, list);
  }
  return [...groups.entries()].map(([org_name, names]) => ({
    org_name,
    names: names.sort(),
  }));
}

export type CoachOrgAttendance = {
  org: { id: string; slug: string; name: string };
  attending: boolean;
};

/**
 * For the event page: orgs the viewer coaches, with whether each is marked
 * as attending this competition. Excludes the hosting org (it doesn't
 * "attend" its own event).
 */
export async function getCoachOrgsWithAttendance(
  userId: string,
  competitionId: string,
  hostingOrgId: string | null
): Promise<CoachOrgAttendance[]> {
  const coached = (await getMyOrgs(userId)).filter(
    (row) => row.isCoach && row.org.id !== hostingOrgId
  );
  if (!coached.length) return [];

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("org_competition_attendance")
    .select("org_id")
    .eq("competition_id", competitionId)
    .in(
      "org_id",
      coached.map((row) => row.org.id)
    );
  const attending = new Set((data ?? []).map((row) => row.org_id as string));

  return coached.map(({ org }) => ({
    org: { id: org.id, slug: org.slug, name: org.name },
    attending: attending.has(org.id),
  }));
}

/** Public events this org has marked as "we're going". */
export async function getOrgAttendedEvents(
  orgId: string
): Promise<OrgEventRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("org_competition_attendance")
    .select(
      "competitions(id, slug, name, city, state, start_date, end_date, visibility, entry_fee_cents)"
    )
    .eq("org_id", orgId);
  return (data ?? [])
    .flatMap((row) => {
      const event = row.competitions as unknown as OrgEventRow | null;
      return event ? [event] : [];
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export type ChildSummary = {
  profile_id: string;
  display_name: string;
  orgs: { id: string; name: string; slug: string }[];
  entrants: EntrantWithEvent[];
};

/** Family dashboard: each active child with their orgs and entrant rows. */
export async function getChildrenWithEvents(
  userId: string
): Promise<ChildSummary[]> {
  const children = await getActiveChildren(userId);
  if (!children.length) return [];
  const childIds = children.map((c) => c.profile_id);

  const supabase = await createServerSupabaseClient();
  const [membershipsRes, entrantsRes] = await Promise.all([
    supabase
      .from("org_memberships")
      .select("profile_id, status, organizations(id, name, slug)")
      .in("profile_id", childIds)
      .eq("status", "active"),
    supabase
      .from("competition_entrants")
      .select(
        "competition_id, profile_id, status, responded_by, competitions(slug, name, city, state, start_date, end_date)"
      )
      .in("profile_id", childIds),
  ]);

  return children.map((child) => ({
    profile_id: child.profile_id,
    display_name: child.display_name,
    orgs: (membershipsRes.data ?? [])
      .filter((row) => row.profile_id === child.profile_id)
      .flatMap((row) => {
        const org = row.organizations as unknown as {
          id: string;
          name: string;
          slug: string;
        } | null;
        return org ? [org] : [];
      }),
    entrants: (entrantsRes.data ?? [])
      .filter((row) => row.profile_id === child.profile_id)
      .map((row) => ({
        competition_id: row.competition_id as string,
        profile_id: row.profile_id as string,
        status: row.status as EntrantStatus,
        responded_by: row.responded_by as string | null,
        competition:
          (row.competitions as unknown as EntrantWithEvent["competition"]) ??
          null,
      }))
      .sort((a, b) =>
        (a.competition?.start_date ?? "").localeCompare(
          b.competition?.start_date ?? ""
        )
      ),
  }));
}

export type ParentRequest = {
  parent_profile_id: string;
  parent_name: string;
  status: "pending" | "active";
  created_at: string;
};

/** For a student's /me page: who has asked to link (or is linked) as parent. */
export async function getParentLinks(userId: string): Promise<ParentRequest[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("household_links")
    .select(
      "parent_profile_id, status, created_at, profiles!household_links_parent_profile_id_fkey(display_name)"
    )
    .eq("child_profile_id", userId)
    .in("status", ["pending", "active"]);
  return (data ?? []).map((row) => ({
    parent_profile_id: row.parent_profile_id as string,
    parent_name:
      ((row.profiles as unknown as { display_name: string } | null)
        ?.display_name ?? "") || "A parent",
    status: row.status as "pending" | "active",
    created_at: row.created_at as string,
  }));
}

/** Parent's outgoing pending requests (no child names before acceptance). */
export async function getPendingChildRequestCount(
  userId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("household_links")
    .select("*", { count: "exact", head: true })
    .eq("parent_profile_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

export async function getOrgGroups(orgId: string): Promise<GroupWithMembers[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("org_groups")
    .select("id, org_id, name, created_at, org_group_members(profile_id)")
    .eq("org_id", orgId)
    .order("name");

  return (data ?? []).map((row) => ({
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    created_at: row.created_at as string,
    member_ids: ((row.org_group_members ?? []) as { profile_id: string }[]).map(
      (m) => m.profile_id
    ),
  }));
}
