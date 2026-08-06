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
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in to track this registration." };
  }
  if (input.status !== "registered" && input.status !== "not_registered") {
    return { ok: false, error: "Choose whether registration is complete." };
  }

  const supabase = await createServerSupabaseClient();
  const statusUpdatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("external_registrations")
    .update({
      status: input.status,
      status_updated_at: statusUpdatedAt,
    })
    .eq("user_id", user.id)
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
        user_id: user.id,
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
  return { ok: true };
}
