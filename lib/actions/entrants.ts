"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

function revalidateEventSurfaces(eventSlug?: string) {
  revalidatePath("/orgs");
  revalidatePath("/family");
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
    .select("profile_id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not save your RSVP." };
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
  const { error } = await supabase.from("competition_entrants").upsert(
    profileIds.map((profileId) => ({
      competition_id: competitionId,
      profile_id: profileId,
      status: "invited",
      invited_by: user.id,
    })),
    { onConflict: "competition_id,profile_id", ignoreDuplicates: true }
  );
  if (error) return { ok: false, error: "Could not send the invites." };

  revalidateEventSurfaces(eventSlug);
  return { ok: true, invited: profileIds.length };
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
  if (error) return { ok: false, error: "Could not read that group." };

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
