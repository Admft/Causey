import type { SupabaseClient } from "@supabase/supabase-js";
import { needsOrganizerRegistration } from "@/lib/data/mobile-family";
import {
  getMyEntrantRows,
  getMyRecommendations,
  isUpcomingEvent,
  type EntrantWithEvent,
  type RecommendationRow,
} from "@/lib/data/portal";

export type MobilePlanEntrant = {
  competition_id: string;
  profile_id: string;
  status: string;
  registration_status: EntrantWithEvent["registration_status"];
  needs_organizer_registration: boolean;
  competition: {
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    start_date: string;
    end_date: string | null;
    reg_url: string | null;
  } | null;
};

export type MobilePlan = {
  needs_action: MobilePlanEntrant[];
  upcoming: MobilePlanEntrant[];
  recommendations: {
    id: string;
    from_name: string;
    note: string | null;
    competition: MobilePlanEntrant["competition"];
  }[];
};

function serialize(row: EntrantWithEvent): MobilePlanEntrant {
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

function serializeRecommendation(row: RecommendationRow) {
  return {
    id: row.id,
    from_name: row.from_name,
    note: row.note,
    competition: row.competition
      ? {
          slug: row.competition.slug,
          name: row.competition.name,
          city: row.competition.city,
          state: row.competition.state,
          start_date: row.competition.start_date,
          end_date: row.competition.end_date,
          reg_url: null,
        }
      : null,
  };
}

export async function getMobilePlan(
  userId: string,
  supabase: SupabaseClient,
  todayIso: string
): Promise<MobilePlan> {
  const [rows, recommendations] = await Promise.all([
    getMyEntrantRows(userId, supabase),
    getMyRecommendations(userId, supabase),
  ]);
  const { data: registrations } = await supabase
    .from("external_registrations")
    .select("competition_id, status")
    .eq("user_id", userId);

  const registrationByCompetition = new Map(
    (registrations ?? []).map((row) => [
      row.competition_id as string,
      row.status as EntrantWithEvent["registration_status"],
    ])
  );

  const upcoming = rows
    .filter((row) => row.competition && isUpcomingEvent(row.competition, todayIso))
    .map((row) => ({
      ...row,
      registration_status:
        registrationByCompetition.get(row.competition_id) ?? null,
    }))
    .sort((a, b) => {
      if (a.status === b.status) {
        return (a.competition?.start_date ?? "").localeCompare(
          b.competition?.start_date ?? ""
        );
      }
      return a.status === "invited" ? -1 : 1;
    });

  return {
    needs_action: upcoming
      .filter(
        (row) => row.status === "invited" || needsOrganizerRegistration(row)
      )
      .map(serialize),
    upcoming: upcoming.map(serialize),
    recommendations: recommendations
      .filter(
        (row) =>
          row.competition && isUpcomingEvent(row.competition, todayIso)
      )
      .map(serializeRecommendation),
  };
}
