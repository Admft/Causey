import {
  isUpcomingEvent,
  type ChildSummary,
  type EntrantWithEvent,
  type OutgoingFamilyRecommendation,
} from "@/lib/data/portal";

export function needsOrganizerRegistration(row: EntrantWithEvent): boolean {
  return (
    row.status === "going" &&
    Boolean(row.competition?.reg_url) &&
    row.registration_status !== "registered"
  );
}

export function pendingInvitesForChild(
  child: { profile_id: string; upcoming: { competition_id: string }[] },
  outgoing: OutgoingFamilyRecommendation[],
  todayIso: string
): OutgoingFamilyRecommendation[] {
  return outgoing.filter((rec) => {
    if (rec.to_profile_id !== child.profile_id || !rec.competition) return false;
    if (!isUpcomingEvent(rec.competition, todayIso)) return false;
    return !child.upcoming.some(
      (row) => row.competition_id === rec.competition_id
    );
  });
}

function serializeCompetition(competition: EntrantWithEvent["competition"]) {
  return competition
    ? {
        slug: competition.slug,
        name: competition.name,
        city: competition.city,
        state: competition.state,
        start_date: competition.start_date,
        end_date: competition.end_date,
        reg_url: competition.reg_url ?? null,
      }
    : null;
}

function serializeEntrant(row: EntrantWithEvent) {
  return {
    competition_id: row.competition_id,
    profile_id: row.profile_id,
    status: row.status,
    registration_status: row.registration_status,
    needs_organizer_registration: needsOrganizerRegistration(row),
    competition: serializeCompetition(row.competition),
  };
}

function serializePendingInvite(
  rec: OutgoingFamilyRecommendation,
  profileId: string
) {
  return {
    competition_id: rec.competition_id,
    profile_id: profileId,
    status: "pending_invite" as const,
    registration_status: null,
    needs_organizer_registration: false,
    competition: rec.competition
      ? {
          slug: rec.competition.slug,
          name: rec.competition.name,
          city: rec.competition.city,
          state: rec.competition.state,
          start_date: rec.competition.start_date,
          end_date: rec.competition.end_date,
          reg_url: null,
        }
      : null,
  };
}

export function serializeFamilyDesk(
  children: ChildSummary[],
  todayIso: string,
  outgoing: OutgoingFamilyRecommendation[] = []
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
    const pending = pendingInvitesForChild(
      { profile_id: child.profile_id, upcoming },
      outgoing,
      todayIso
    );
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
      pending_invites: pending.map((rec) =>
        serializePendingInvite(rec, child.profile_id)
      ),
      needs_action: needsAction.map(serializeEntrant),
      upcoming: upcoming.map(serializeEntrant),
    };
  });
}
