import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationType } from "@/lib/auth/orgs";
import { getMyOrgs, isUpcomingEvent } from "@/lib/data/portal";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";

export type MobileTeamOrg = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  /** District offices coordinate through connected schools; they hold no roster. */
  has_roster: boolean;
};

export type MobileTeamEvent = {
  competition_id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  relation: "hosted" | "travel";
  org_name: string;
};

export type MobileTeam = {
  orgs: MobileTeamOrg[];
  events: MobileTeamEvent[];
};

type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  org_id: string | null;
  status: string;
};

/** Statuses a coach can still work on the day of; archived and rejected cannot. */
const WORKABLE = new Set(["draft", "pending_review", "published"]);

/**
 * Coach home on the phone: the organizations this account actually staffs and
 * the upcoming events those organizations host or travel to. Everything a coach
 * does at a desk — invites, CSV, settings, reports — stays on the website.
 */
export async function getMobileTeam(
  userId: string,
  supabase: SupabaseClient,
  todayIso: string
): Promise<MobileTeam> {
  const memberships = await getMyOrgs(userId, supabase);
  const staffed = memberships.filter((row) => row.isCoach);
  if (!staffed.length) return { orgs: [], events: [] };

  const orgs: MobileTeamOrg[] = staffed.map((row) => ({
    id: row.org.id,
    name: row.org.name,
    slug: row.org.slug,
    type: row.org.type,
    has_roster: canMarkOrganizationAttending(row.org),
  }));
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));
  const orgIds = orgs.map((org) => org.id);

  const [hostedRes, travelRes] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        "id, slug, name, city, state, start_date, end_date, org_id, status"
      )
      .in("org_id", orgIds),
    supabase
      .from("org_competition_attendance")
      .select(
        "org_id, competitions(id, slug, name, city, state, start_date, end_date, org_id, status)"
      )
      .in("org_id", orgIds),
  ]);

  const events = new Map<string, MobileTeamEvent>();

  for (const row of (hostedRes.data ?? []) as CompetitionRow[]) {
    if (!WORKABLE.has(row.status)) continue;
    if (!isUpcomingEvent(row, todayIso)) continue;
    events.set(row.id, {
      competition_id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      state: row.state,
      start_date: row.start_date,
      end_date: row.end_date,
      relation: "hosted",
      org_name: orgNameById.get(row.org_id ?? "") ?? "Your organization",
    });
  }

  for (const row of travelRes.data ?? []) {
    const competition = row.competitions as unknown as CompetitionRow | null;
    if (!competition || !WORKABLE.has(competition.status)) continue;
    if (!isUpcomingEvent(competition, todayIso)) continue;
    // A hosted row already carries the stronger relation; don't downgrade it.
    if (events.has(competition.id)) continue;
    events.set(competition.id, {
      competition_id: competition.id,
      slug: competition.slug,
      name: competition.name,
      city: competition.city,
      state: competition.state,
      start_date: competition.start_date,
      end_date: competition.end_date,
      relation: "travel",
      org_name: orgNameById.get(row.org_id as string) ?? "Your organization",
    });
  }

  return {
    orgs,
    events: [...events.values()].sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    ),
  };
}
