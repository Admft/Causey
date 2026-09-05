import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

async function writeExistingRsvp(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  status: "going" | "not_going";
  responseSource: "self" | "parent";
  respondedAt: string;
}) {
  return input.supabase
    .from("competition_entrants")
    .update({
      status: input.status,
      responded_by: input.userId,
      responded_at: input.respondedAt,
      response_source: input.responseSource,
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .select("profile_id, invited_by");
}

async function notifyInvitingCoach(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  status: "going" | "not_going";
  invitedBy: string;
  eventSlug?: string;
}): Promise<ActionResult> {
  const { data: competition } = await input.supabase
    .from("competitions")
    .select("name, slug")
    .eq("id", input.competitionId)
    .maybeSingle();
  const eventName = competition?.name ?? "a tournament";
  const slug = competition?.slug ?? input.eventSlug;
  const statusLabel = input.status === "going" ? "going" : "not going";
  const notifications = await createInAppNotifications(
    [
      {
        recipientId: input.invitedBy,
        kind: "rsvp_update",
        title: `RSVP update: ${eventName}`,
        body: `Someone marked ${statusLabel}. Open the event roster to review.`,
        href: slug ? `/event/${slug}/manage` : "/orgs",
        entityType: "competition",
        entityId: input.competitionId,
        dedupeKey: `rsvp:${input.competitionId}:${input.profileId}:${input.status}`,
      },
    ],
    { client: input.supabase }
  );
  if (notifications.failures.length) {
    return {
      ok: false,
      error: "Your RSVP was saved, but the coach update could not be created.",
    };
  }
  return { ok: true };
}

export async function performSetRsvp(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  status: "going" | "not_going";
  eventSlug?: string;
}): Promise<ActionResult> {
  if (input.status !== "going" && input.status !== "not_going") {
    return { ok: false, error: "Pick going or not going." };
  }

  const responseSource: "self" | "parent" =
    input.profileId === input.userId ? "self" : "parent";
  const respondedAt = new Date().toISOString();
  const writeArgs = {
    supabase: input.supabase,
    userId: input.userId,
    competitionId: input.competitionId,
    profileId: input.profileId,
    status: input.status,
    responseSource,
    respondedAt,
  };

  const { data, error } = await writeExistingRsvp(writeArgs);
  if (error) {
    return { ok: false, error: "Could not save your RSVP." };
  }

  let invitedBy = data?.[0]?.invited_by as string | null | undefined;

  if (!data?.length) {
    const { error: insertError } = await input.supabase
      .from("competition_entrants")
      .insert({
        competition_id: input.competitionId,
        profile_id: input.profileId,
        status: input.status,
        invited_by: input.userId,
        responded_by: input.userId,
        responded_at: respondedAt,
        response_source: responseSource,
      });
    if (!insertError) {
      return { ok: true };
    }
    if (insertError.code !== "23505") {
      return { ok: false, error: "Could not save your RSVP." };
    }
    const retry = await writeExistingRsvp(writeArgs);
    if (retry.error || !retry.data?.length) {
      return { ok: false, error: "Could not save your RSVP." };
    }
    invitedBy = retry.data[0]?.invited_by as string | null | undefined;
  }

  if (invitedBy && invitedBy !== input.userId) {
    return notifyInvitingCoach({
      supabase: input.supabase,
      userId: input.userId,
      competitionId: input.competitionId,
      profileId: input.profileId,
      status: input.status,
      invitedBy,
      eventSlug: input.eventSlug,
    });
  }

  return { ok: true };
}
