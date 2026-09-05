"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { performSetExternalRegistration } from "@/lib/external-registration-write";
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
