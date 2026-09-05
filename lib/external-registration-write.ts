import type { AuthedSupabase } from "@/lib/supabase/authed";
import type { ActionResult } from "@/lib/actions/result";

export async function performSetExternalRegistration(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  status: "registered" | "not_registered";
}): Promise<ActionResult> {
  if (input.status !== "registered" && input.status !== "not_registered") {
    return { ok: false, error: "Choose whether registration is complete." };
  }

  const targetProfileId = input.profileId;
  if (targetProfileId !== input.userId) {
    const { data: link } = await input.supabase
      .from("household_links")
      .select("child_profile_id")
      .eq("parent_profile_id", input.userId)
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
  const { data: updated, error: updateError } = await input.supabase
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
    const { error: insertError } = await input.supabase
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

  return { ok: true };
}
