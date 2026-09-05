import { isUpcomingEvent, type ChildSummary, type EntrantWithEvent } from "@/lib/data/portal";

export function needsOrganizerRegistration(row: EntrantWithEvent): boolean {
  return (
    row.status === "going" &&
    Boolean(row.competition?.reg_url) &&
    row.registration_status !== "registered"
  );
}

function serializeEntrant(row: EntrantWithEvent) {
  return {
    competition_id: row.competition_id,
    profile_id: row.profile_id,
    status: row.status,
    registration_status: row.registration_status,
    needs_organizer_registration: needsOrganizerRegistration(row),
    competition: row.competition
      ? {
          slug: row.competition.slug,
          name: row.competition.name,
          city: row.competition.city,
          state: row.competition.state,
          start_date: row.competition.start_date,
          end_date: row.competition.end_date,
          reg_url: row.competition.reg_url,
        }
      : null,
  };
}

export function serializeFamilyDesk(
  children: ChildSummary[],
  todayIso: string
) {
  return children.map((child) => {
    const upcoming = child.entrants
      .filter(
        (row) => row.competition && isUpcomingEvent(row.competition, todayIso)
      )
      .sort((a, b) => {
        if (a.status === b.status) {
          return (a.competition?.start_date ?? "").localeCompare(
            b.competition?.start_date ?? ""
          );
        }
        return a.status === "invited" ? -1 : 1;
      });
    const needsAction = upcoming.filter(
      (row) => row.status === "invited" || needsOrganizerRegistration(row)
    );
    return {
      profile_id: child.profile_id,
      display_name: child.display_name,
      orgs: child.orgs.map((org) => ({
        name: org.name,
        type: org.type,
      })),
      needs_action: needsAction.map(serializeEntrant),
      upcoming: upcoming.map(serializeEntrant),
    };
  });
}
