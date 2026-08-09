"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
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

  if (targetProfileId !== user.id) {
    const { data: link } = await supabase
      .from("household_links")
      .select("child_profile_id")
      .eq("parent_profile_id", user.id)
      .eq("child_profile_id", targetProfileId)
      .eq("status", "active")
      .maybeSingle();
    if (!link) {
      return {
        ok: false,
        error: "You can only update registration for a linked student.",
      };
    }
  }

  const statusUpdatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("external_registrations")
    .update({
      status: input.status,
      status_updated_at: statusUpdatedAt,
    })
    .eq("user_id", targetProfileId)
    .eq("competition_id", input.competitionId)
    .select("competition_id");

  if (updateError) {
    return {
      ok: false,
      error: "Could not save the registration status. Try again.",
    };
  }

  if (!updated?.length) {
    const { error: insertError } = await supabase
      .from("external_registrations")
      .insert({
        user_id: targetProfileId,
        competition_id: input.competitionId,
        status: input.status,
        opened_at: statusUpdatedAt,
        status_updated_at: statusUpdatedAt,
      });
    if (insertError) {
      return {
        ok: false,
        error: "Could not save the registration status. Try again.",
      };
    }
  }

  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath("/me");
  revalidatePath("/family");
  revalidatePath("/me/notifications");
  return { ok: true };
}
