"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createInAppNotifications } from "@/lib/actions/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

function revalidateEventSurfaces(eventSlug?: string) {
  revalidatePath("/me");
  revalidatePath("/orgs");
  revalidatePath("/family");
  revalidatePath("/me/notifications");
  if (eventSlug) {
    revalidatePath(`/event/${eventSlug}`);
    revalidatePath(`/event/${eventSlug}/manage`);
  }
}

/**
 * RSVP for yourself or (as a linked parent) for your child — RLS decides
 * which rows the update may touch, and responded_by must be the caller.
 */
export async function setRsvp(input: {
  competitionId: string;
  profileId: string;
  status: "going" | "not_going";
  eventSlug?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to RSVP." };
  if (input.status !== "going" && input.status !== "not_going") {
    return { ok: false, error: "Pick going or not going." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competition_entrants")
    .update({
      status: input.status,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .select("profile_id, invited_by");
  if (error || !data?.length) {
    return { ok: false, error: "Could not save your RSVP." };
  }

  const invitedBy = data[0]?.invited_by as string | null | undefined;
  if (invitedBy && invitedBy !== user.id) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name, slug")
      .eq("id", input.competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    const slug = competition?.slug ?? input.eventSlug;
    const statusLabel = input.status === "going" ? "going" : "not going";
    await createInAppNotifications([
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
    ]);
  }

  revalidateEventSurfaces(input.eventSlug);
  return { ok: true };
}

export async function inviteEntrants(
  competitionId: string,
  eventSlug: string,
  profileIds: string[]
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  if (!profileIds.length) return { ok: true, invited: 0 };

  const supabase = await createServerSupabaseClient();

  // #region agent log
  const { debugAgentLog, debugOperatorPermissions } = await import(
    "@/lib/debug/operator-permissions"
  );
  const { data: competitionMeta } = await supabase
    .from("competitions")
    .select("org_id, slug")
    .eq("id", competitionId)
    .maybeSingle();
  const perms = await debugOperatorPermissions(
    supabase,
    user.id,
    competitionMeta?.org_id ?? null
  );
  const { data: canInviteSample } = await supabase.rpc(
    "can_invite_to_competition",
    {
      p_competition_id: competitionId,
      p_entrant_id: profileIds[0],
      p_inviter_id: user.id,
    }
  );
  debugAgentLog({
    hypothesisId: "D",
    location: "lib/actions/entrants.ts:inviteEntrants",
    message: "invite entrants permission snapshot",
    data: {
      competitionId,
      eventSlug,
      profileCount: profileIds.length,
      canInviteSample: canInviteSample === true,
      ...perms,
    },
  });
  // #endregion

  const { data, error } = await supabase
    .from("competition_entrants")
    .upsert(
      profileIds.map((profileId) => ({
        competition_id: competitionId,
        profile_id: profileId,
        status: "invited",
        invited_by: user.id,
      })),
      { onConflict: "competition_id,profile_id", ignoreDuplicates: true }
    )
    .select("profile_id");
  if (error) {
    // #region agent log
    debugAgentLog({
      hypothesisId: "D",
      location: "lib/actions/entrants.ts:inviteEntrants:upsert",
      message: "invite entrants failed",
      data: { code: error.code, err: error.message, ...perms },
    });
    // #endregion
    return {
      ok: false,
      error: "Could not send the invitations. Check your connection and try again.",
    };
  }

  const invitedIds = (data ?? []).map((row) => row.profile_id as string);
  if (invitedIds.length) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name")
      .eq("id", competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    await createInAppNotifications(
      invitedIds
        .filter((profileId) => profileId !== user.id)
        .map((profileId) => ({
          recipientId: profileId,
          kind: "invitation" as const,
          title: `Invitation: ${eventName}`,
          body: "A coach invited you. Respond going or not going on the event page.",
          href: `/event/${eventSlug}`,
          entityType: "competition",
          entityId: competitionId,
          dedupeKey: `invitation:${competitionId}:${profileId}`,
        }))
    );
  }

  revalidateEventSurfaces(eventSlug);
  return { ok: true, invited: invitedIds.length };
}

export async function inviteGroup(
  competitionId: string,
  eventSlug: string,
  groupId: string
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data: members, error } = await supabase
    .from("org_group_members")
    .select("profile_id")
    .eq("group_id", groupId);
  if (error) {
    return {
      ok: false,
      error: "Could not load that group. Reload the page and try again.",
    };
  }

  return inviteEntrants(
    competitionId,
    eventSlug,
    (members ?? []).map((m) => m.profile_id)
  );
}

export async function removeEntrant(
  competitionId: string,
  eventSlug: string,
  profileId: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("competition_entrants")
    .delete()
    .eq("competition_id", competitionId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: "Could not remove this entrant." };

  revalidateEventSurfaces(eventSlug);
  return { ok: true };
}
