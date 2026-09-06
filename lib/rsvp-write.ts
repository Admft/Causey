import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import type { ActionResult } from "@/lib/actions/result";
import { clearRsvpMode } from "@/lib/rsvp";
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
  status: "going" | "not_going" | "cleared";
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
  const body =
    input.status === "cleared"
      ? "Someone cleared their RSVP. Open the event roster to review."
      : `Someone marked ${
          input.status === "going" ? "going" : "not going"
        }. Open the event roster to review.`;
  const notifications = await createInAppNotifications(
    [
      {
        recipientId: input.invitedBy,
        kind: "rsvp_update",
        title: `RSVP update: ${eventName}`,
        body,
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

async function assertCanWriteFamilyRsvp(
  supabase: AuthedSupabase,
  userId: string,
  profileId: string
): Promise<ActionResult> {
  if (profileId === userId) return { ok: true };
  const { data: link } = await supabase
    .from("household_links")
    .select("child_profile_id")
    .eq("parent_profile_id", userId)
    .eq("child_profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();
  if (!link) {
    return {
      ok: false,
      error: "You can only update an RSVP for a linked student.",
    };
  }
  return { ok: true };
}

/**
 * Return Going / Can't go to no answer. Family-discovery rows are deleted;
 * a coach invite is reset to invited so the organization still sees them.
 */
export async function performClearRsvp(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  eventSlug?: string;
}): Promise<ActionResult> {
  const allowed = await assertCanWriteFamilyRsvp(
    input.supabase,
    input.userId,
    input.profileId
  );
  if (!allowed.ok) return allowed;

  const { data: row, error } = await input.supabase
    .from("competition_entrants")
    .select("status, invited_by, profile_id")
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: "Could not clear that RSVP." };
  }
  if (!row) return { ok: true };
  if (row.status === "attended" || row.status === "did_not_attend") {
    return {
      ok: false,
      error: "Attendance is already recorded, so this RSVP cannot be cleared.",
    };
  }
  if (row.status === "invited") return { ok: true };

  await input.supabase
    .from("external_registrations")
    .update({
      status: "not_registered",
      status_updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.profileId)
    .eq("competition_id", input.competitionId);

  const invitedBy = row.invited_by as string | null;
  const mode = clearRsvpMode({
    invited_by: invitedBy,
    profile_id: row.profile_id as string,
    callerId: input.userId,
  });

  if (mode === "delete") {
    const { data: removed, error: deleteError } = await input.supabase
      .from("competition_entrants")
      .delete()
      .eq("competition_id", input.competitionId)
      .eq("profile_id", input.profileId)
      .in("status", ["going", "not_going"])
      .select("profile_id");
    if (deleteError || !removed?.length) {
      return { ok: false, error: "Could not clear that RSVP." };
    }
    return { ok: true };
  }

  const { data: reset, error: resetError } = await input.supabase
    .from("competition_entrants")
    .update({
      status: "invited",
      responded_by: null,
      responded_at: null,
      response_source: null,
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .in("status", ["going", "not_going"])
    .select("profile_id, invited_by");
  if (resetError || !reset?.length) {
    return { ok: false, error: "Could not clear that RSVP." };
  }

  if (invitedBy && invitedBy !== input.userId) {
    return notifyInvitingCoach({
      supabase: input.supabase,
      userId: input.userId,
      competitionId: input.competitionId,
      profileId: input.profileId,
      status: "cleared",
      invitedBy,
      eventSlug: input.eventSlug,
    });
  }

  return { ok: true };
}
