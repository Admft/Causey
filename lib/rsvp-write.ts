import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

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

  const responseSource =
    input.profileId === input.userId ? "self" : "parent";
  const { data, error } = await input.supabase
    .from("competition_entrants")
    .update({
      status: input.status,
      responded_by: input.userId,
      responded_at: new Date().toISOString(),
      response_source: responseSource,
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .select("profile_id, invited_by");
  if (error || !data?.length) {
    return { ok: false, error: "Could not save your RSVP." };
  }

  const invitedBy = data[0]?.invited_by as string | null | undefined;
  if (invitedBy && invitedBy !== input.userId) {
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
          recipientId: invitedBy,
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
  }

  return { ok: true };
}
