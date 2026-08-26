import type { OrganizationType } from "@/lib/auth/orgs";
import type { AccountRole } from "@/lib/auth/types";
import { formatDateRange } from "@/lib/format";
import { organizationKindLabel } from "@/lib/portal-copy";

export const HOME_MY_TOURNAMENTS_LIMIT = 5;
export const HOME_MY_TOURNAMENTS_PATH = "/?view=mine";
export const HOME_MY_TOURNAMENTS_LOGIN_HREF = `/login?next=${encodeURIComponent(HOME_MY_TOURNAMENTS_PATH)}`;
export const HOME_MY_TOURNAMENTS_SIGNUP_HREF = `/signup?next=${encodeURIComponent(HOME_MY_TOURNAMENTS_PATH)}`;

export type HomeMyTournamentKind =
  | "invited"
  | "going"
  | "traveling"
  | "hosted";

export type HomeMyTournamentRow = {
  competitionId: string;
  slug: string;
  name: string;
  meta: string;
  startDate: string;
  reason: string;
  kind: HomeMyTournamentKind;
};

export type HomeMyTournamentsSummary = {
  items: HomeMyTournamentRow[];
  seeAll: { href: string; label: string };
  emptyTitle: string;
  emptyDescription: string;
};

const KIND_RANK: Record<HomeMyTournamentKind, number> = {
  invited: 4,
  going: 3,
  traveling: 2,
  hosted: 1,
};

export function goingReason(childName?: string): string {
  return childName ? `Going · ${childName}` : "Going";
}

export function invitedReason(childName?: string): string {
  return childName ? `Needs RSVP · ${childName}` : "Needs RSVP";
}

export function travelingReason(orgType: OrganizationType): string {
  return `Your ${organizationKindLabel(orgType)} is traveling`;
}

export function hostedReason(orgName: string): string {
  return `Hosted by ${orgName}`;
}

export function eventListMeta(
  competition: {
    city: string | null;
    state: string | null;
    start_date: string;
    end_date: string | null;
  }
): string {
  const location = [competition.city, competition.state]
    .filter(Boolean)
    .join(", ");
  return `${formatDateRange(competition.start_date, competition.end_date)}${
    location ? ` · ${location}` : ""
  }`;
}

export function homeMyTournamentsEmptyCopy(
  role: AccountRole,
  hasDistrictAccess: boolean
): { title: string; description: string } {
  if (role === "parent") {
    return {
      title: "No upcoming events for your students",
      description:
        "Invitations and Going RSVPs show here after a coach adds a student to an event.",
    };
  }
  if (hasDistrictAccess) {
    return {
      title: "No upcoming school or district competitions",
      description:
        "Hosted and traveling events for your schools appear here once they are on the calendar.",
    };
  }
  if (role === "coach") {
    return {
      title: "No upcoming club or team events",
      description:
        "Hosted competitions and events your club or team is traveling to appear here.",
    };
  }
  return {
    title: "No upcoming club RSVPs or org events yet",
    description:
      "Events you marked Going, and tournaments your club or team hosts or travels to, show up here.",
  };
}

export function mergeHomeMyTournamentRows(
  rows: HomeMyTournamentRow[],
  limit = HOME_MY_TOURNAMENTS_LIMIT
): HomeMyTournamentRow[] {
  const byId = new Map<string, HomeMyTournamentRow>();
  for (const row of rows) {
    const current = byId.get(row.competitionId);
    if (!current || KIND_RANK[row.kind] > KIND_RANK[current.kind]) {
      byId.set(row.competitionId, row);
    }
  }
  return [...byId.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
}

export function isHomeMyTournamentsView(
  view: string | string[] | undefined
): boolean {
  const value = Array.isArray(view) ? view[0] : view;
  return value === "mine";
}
