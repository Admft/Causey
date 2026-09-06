import type { AccountRole } from "@/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCompetitionEnded } from "@/lib/competition-timing";
import {
  allowsFamilyDiscoveryRsvp,
  buildEventRsvpTargets,
  organizerRegistrationProfileIds,
  type EventRsvpTarget,
} from "@/lib/event-rsvp-targets";
import type { ExternalRegistrationStatus } from "@/lib/actions/external-registrations";
import {
  getActiveChildren,
  getEntrantsForCompetition,
  getRatingSummary,
  getSentRecommendationRecipientIds,
} from "@/lib/data/portal";

export type MobileRegistrationTarget = {
  profileId: string;
  label: string;
  status: ExternalRegistrationStatus | null;
};

export type MobileEventAttendance = {
  ended: boolean;
  rsvp: EventRsvpTarget[];
  registration: MobileRegistrationTarget[];
  sent_recommendation_ids: string[];
  my_score: number | null;
  rating: { avg_score: number; rating_count: number } | null;
};

export async function getMobileEventAttendance(input: {
  supabase: SupabaseClient;
  userId: string;
  viewerRole: AccountRole | null;
  competitionId: string;
}): Promise<MobileEventAttendance | null> {
  const { data: competition, error } = await input.supabase
    .from("competitions")
    .select("id, slug, status, visibility, audience, start_date, end_date")
    .eq("id", input.competitionId)
    .maybeSingle();
  if (error || !competition) return null;

  const ended = isCompetitionEnded({
    start_date: competition.start_date as string,
    end_date: (competition.end_date as string | null) ?? null,
  });
  const children = await getActiveChildren(input.userId, input.supabase);
  const childIds = children.map((child) => child.profile_id);
  const entrants = await getEntrantsForCompetition(
    input.competitionId,
    [input.userId, ...childIds],
    input.supabase
  );
  const rsvp = buildEventRsvpTargets({
    viewerId: input.userId,
    viewerRole: input.viewerRole,
    children,
    entrants,
    familyDiscovery: allowsFamilyDiscoveryRsvp({
      status: (competition.status as string | null) ?? null,
      visibility: (competition.visibility as string | null) ?? null,
      audience: (competition.audience as string | null) ?? null,
    }),
    ended,
  });

  const registrationProfileIds = organizerRegistrationProfileIds({
    viewerId: input.userId,
    childIds,
    entrants,
  });
  const [{ data: scoreRow }, rating, { data: registrations }, sentIds] =
    await Promise.all([
      input.supabase
        .from("competition_ratings")
        .select("score")
        .eq("user_id", input.userId)
        .eq("competition_id", input.competitionId)
        .maybeSingle(),
      getRatingSummary(input.competitionId, input.supabase),
      registrationProfileIds.length
        ? input.supabase
            .from("external_registrations")
            .select("user_id, status")
            .eq("competition_id", input.competitionId)
            .in("user_id", registrationProfileIds)
        : Promise.resolve({
            data: [] as { user_id: string; status: string }[],
          }),
      getSentRecommendationRecipientIds(
        input.competitionId,
        input.userId,
        input.supabase
      ),
    ]);

  const registrationByUser = new Map(
    (registrations ?? []).map((row) => [
      row.user_id as string,
      row.status as ExternalRegistrationStatus,
    ])
  );
  const registration: MobileRegistrationTarget[] = registrationProfileIds.map(
    (profileId) => ({
      profileId,
      label:
        profileId === input.userId
          ? "You"
          : children.find((child) => child.profile_id === profileId)
              ?.display_name ?? "Your student",
      status: registrationByUser.get(profileId) ?? null,
    })
  );

  return {
    ended,
    rsvp,
    registration,
    sent_recommendation_ids: sentIds,
    my_score:
      typeof scoreRow?.score === "number" ? (scoreRow.score as number) : null,
    rating,
  };
}
