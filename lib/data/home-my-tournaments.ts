import "server-only";

import type { OrganizationType } from "@/lib/auth/orgs";
import type { AccountRole, Profile } from "@/lib/auth/types";
import {
  getChildSchoolsForDistrict,
  getChildrenWithEvents,
  getMyEntrantRows,
  getMyOrgs,
  getOrgAttendedEvents,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import {
  eventListMeta,
  goingReason,
  homeMyTournamentsEmptyCopy,
  hostedReason,
  invitedReason,
  mergeHomeMyTournamentRows,
  travelingReason,
  type HomeMyTournamentRow,
  type HomeMyTournamentsSummary,
} from "@/lib/home-my-tournaments";
import { workspaceOpenCta } from "@/lib/portal-copy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function emptySummary(
  role: AccountRole,
  hasDistrictAccess: boolean
): HomeMyTournamentsSummary {
  const empty = homeMyTournamentsEmptyCopy(role, hasDistrictAccess);
  return {
    items: [],
    seeAll: workspaceOpenCta(role, { hasDistrictAccess }),
    emptyTitle: empty.title,
    emptyDescription: empty.description,
  };
}

/**
 * Homepage preview of events this account is actually tied to: personal
 * Going / Needs RSVP, a parent's linked students, and staff hosted or
 * traveling events. Saved bookmarks and organizer-site marks stay on Plan.
 */
export async function getHomeMyTournaments(
  profile: Profile
): Promise<HomeMyTournamentsSummary> {
  if (!isSupabaseConfigured()) {
    return emptySummary(profile.role, false);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [entrantRows, orgs, children] = await Promise.all([
      getMyEntrantRows(profile.id),
      getMyOrgs(profile.id),
      profile.role === "parent"
        ? getChildrenWithEvents(profile.id)
        : Promise.resolve([]),
    ]);

    const staffOrgs = orgs.filter((row) => row.isCoach);
    const hasDistrictAccess = staffOrgs.some(
      (row) =>
        row.org.type === "district" || row.memberRole === "district_admin"
    );

    const collected: HomeMyTournamentRow[] = [];

    for (const row of entrantRows) {
      if (
        !row.competition ||
        (row.status !== "going" && row.status !== "invited") ||
        !isUpcomingEvent(row.competition, today)
      ) {
        continue;
      }
      collected.push({
        competitionId: row.competition_id,
        slug: row.competition.slug,
        name: row.competition.name,
        meta: eventListMeta(row.competition),
        startDate: row.competition.start_date,
        reason: row.status === "invited" ? invitedReason() : goingReason(),
        kind: row.status === "invited" ? "invited" : "going",
      });
    }

    for (const child of children) {
      for (const row of child.entrants) {
        if (
          !row.competition ||
          (row.status !== "going" && row.status !== "invited") ||
          !isUpcomingEvent(row.competition, today)
        ) {
          continue;
        }
        collected.push({
          competitionId: row.competition_id,
          slug: row.competition.slug,
          name: row.competition.name,
          meta: eventListMeta(row.competition),
          startDate: row.competition.start_date,
          reason:
            row.status === "invited"
              ? invitedReason(child.display_name)
              : goingReason(child.display_name),
          kind: row.status === "invited" ? "invited" : "going",
        });
      }
    }

    const districtChildren = await Promise.all(
      staffOrgs
        .filter((row) => row.org.type === "district")
        .map((row) => getChildSchoolsForDistrict(row.org.id))
    );
    const hosts = new Map<string, { name: string; type: OrganizationType }>();
    for (const row of staffOrgs) {
      hosts.set(row.org.id, { name: row.org.name, type: row.org.type });
    }
    for (const schools of districtChildren) {
      for (const school of schools) {
        if (!hosts.has(school.id)) {
          hosts.set(school.id, { name: school.name, type: "school" });
        }
      }
    }

    const hostIds = [...hosts.keys()];
    if (hostIds.length > 0) {
      const supabase = await createServerSupabaseClient();
      const { data: hostedRows } = await supabase
        .from("competitions")
        .select("id, slug, name, city, state, start_date, end_date, org_id")
        .in("org_id", hostIds)
        .eq("status", "published");

      for (const event of hostedRows ?? []) {
        if (
          !isUpcomingEvent(
            {
              start_date: event.start_date as string,
              end_date: (event.end_date as string | null) ?? null,
            },
            today
          )
        ) {
          continue;
        }
        const host = hosts.get(event.org_id as string);
        collected.push({
          competitionId: event.id as string,
          slug: event.slug as string,
          name: event.name as string,
          meta: eventListMeta({
            city: (event.city as string | null) ?? null,
            state: (event.state as string | null) ?? null,
            start_date: event.start_date as string,
            end_date: (event.end_date as string | null) ?? null,
          }),
          startDate: event.start_date as string,
          reason: hostedReason(host?.name ?? "your organization"),
          kind: "hosted",
        });
      }

      const travelingLists = await Promise.all(
        staffOrgs.map(async (row) => ({
          org: row.org,
          events: await getOrgAttendedEvents(row.org.id),
        }))
      );
      for (const { org, events } of travelingLists) {
        for (const event of events) {
          if (event.status !== "published") continue;
          if (!isUpcomingEvent(event, today)) continue;
          collected.push({
            competitionId: event.id,
            slug: event.slug,
            name: event.name,
            meta: eventListMeta(event),
            startDate: event.start_date,
            reason: travelingReason(org.type),
            kind: "traveling",
          });
        }
      }
    }

    const empty = homeMyTournamentsEmptyCopy(profile.role, hasDistrictAccess);
    return {
      items: mergeHomeMyTournamentRows(collected),
      seeAll: workspaceOpenCta(profile.role, { hasDistrictAccess }),
      emptyTitle: empty.title,
      emptyDescription: empty.description,
    };
  } catch (error) {
    console.error("Homepage my-tournaments preview failed:", error);
    return emptySummary(profile.role, false);
  }
}
