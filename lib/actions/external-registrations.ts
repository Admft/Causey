"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { performSetExternalRegistration } from "@/lib/external-registration-write";
import { performSetRsvp } from "@/lib/rsvp-write";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

export type ExternalRegistrationStatus =
  | "opened"
  | "registered"
  | "not_registered";

export async function setExternalRegistrationStatus(input: {
  competitionId: string;
  eventSlug: string;
  status: "registered" | "not_registered";
  /** Defaults to the signed-in user; parents may pass a linked child. */
  profileId?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in to track this registration." };
  }
  if (input.status !== "registered" && input.status !== "not_registered") {
    return { ok: false, error: "Choose whether registration is complete." };
  }

  const targetProfileId = input.profileId ?? user.id;
  const supabase = await createServerSupabaseClient();
  const result = await performSetExternalRegistration({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    profileId: targetProfileId,
    status: input.status,
  });
  if (result.ok) {
    revalidatePath(`/event/${input.eventSlug}`);
    revalidatePath("/me");
    revalidatePath("/family");
    revalidatePath("/me/notifications");
  }
  return result;
}

/**
 * Drop this event from Plan/Family: they are not going, and Causey should
 * stop treating organizer registration as complete. Causey cannot cancel
 * organizer entry — the caller still has to do that on the organizer site.
 */
export async function leaveOrganizerTrackedEvent(input: {
  competitionId: string;
  eventSlug: string;
  profileId?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in to update this event." };
  }

  const targetProfileId = input.profileId ?? user.id;
  const supabase = await createServerSupabaseClient();
  const registration = await performSetExternalRegistration({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    profileId: targetProfileId,
    status: "not_registered",
  });
  if (!registration.ok) return registration;

  const rsvp = await performSetRsvp({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    profileId: targetProfileId,
    status: "not_going",
    eventSlug: input.eventSlug,
  });
  if (
    !rsvp.ok &&
    rsvp.error !==
      "Your RSVP was saved, but the coach update could not be created."
  ) {
    return rsvp;
  }

  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath("/me");
  revalidatePath("/family");
  revalidatePath("/orgs");
  revalidatePath("/me/notifications");
  return rsvp.ok ? { ok: true } : rsvp;
}
