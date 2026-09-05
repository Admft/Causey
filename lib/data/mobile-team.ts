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
  past_events: MobileTeamEvent[];
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

const PAST_WINDOW_DAYS = 90;
const PAST_LIMIT = 20;

const EMPTY_TEAM: MobileTeam = { orgs: [], events: [], past_events: [] };

function isoDaysBefore(todayIso: string, days: number): string {
  const [year, month, day] = todayIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function toTeamEvent(
  row: CompetitionRow,
  relation: "hosted" | "travel",
  orgId: string | null,
  orgNameById: Map<string, string>
): MobileTeamEvent {
  return {
    competition_id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    state: row.state,
    start_date: row.start_date,
    end_date: row.end_date,
    relation,
    org_name: orgNameById.get(orgId ?? "") ?? "Your organization",
  };
}

/**
 * Coach home on the phone: the organizations this account actually staffs,
 * upcoming hosted/travel events, and recent past events so attendance and
 * results can still be recorded. Desk work — invites, CSV, settings, reports
 * — stays on the website.
 */
export async function getMobileTeam(
  userId: string,
  supabase: SupabaseClient,
  todayIso: string
): Promise<MobileTeam> {
  const memberships = await getMyOrgs(userId, supabase);
  const staffed = memberships.filter((row) => row.isCoach);
  if (!staffed.length) return EMPTY_TEAM;

  const orgs: MobileTeamOrg[] = staffed.map((row) => ({
    id: row.org.id,
    name: row.org.name,
    slug: row.org.slug,
    type: row.org.type,
    has_roster: canMarkOrganizationAttending(row.org),
  }));
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));
  const orgIds = orgs.map((org) => org.id);
  const pastCutoff = isoDaysBefore(todayIso, PAST_WINDOW_DAYS);

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
  const pastEvents = new Map<string, MobileTeamEvent>();

  const consider = (
    row: CompetitionRow,
    relation: "hosted" | "travel",
    orgId: string | null
  ) => {
    if (!WORKABLE.has(row.status)) return;
    if (relation === "travel" && (events.has(row.id) || pastEvents.has(row.id))) {
      return;
    }
    const item = toTeamEvent(row, relation, orgId, orgNameById);
    if (isUpcomingEvent(row, todayIso)) {
      events.set(row.id, item);
      return;
    }
    const lastDay = row.end_date ?? row.start_date;
    if (lastDay < pastCutoff) return;
    pastEvents.set(row.id, item);
  };

  for (const row of (hostedRes.data ?? []) as CompetitionRow[]) {
    consider(row, "hosted", row.org_id);
  }

  for (const row of travelRes.data ?? []) {
    const competition = row.competitions as unknown as CompetitionRow | null;
    if (!competition) continue;
    consider(competition, "travel", row.org_id as string);
  }

  return {
    orgs,
    events: [...events.values()].sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    ),
    past_events: [...pastEvents.values()]
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
      .slice(0, PAST_LIMIT),
  };
}
