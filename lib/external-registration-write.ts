import type { AuthedSupabase } from "@/lib/supabase/authed";
import type { ActionResult } from "@/lib/actions/result";

async function assertCanWriteRegistration(
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
      error: "You can only update registration for a linked student.",
    };
  }
  return { ok: true };
}

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

  const allowed = await assertCanWriteRegistration(
    input.supabase,
    input.userId,
    input.profileId
  );
  if (!allowed.ok) return allowed;

  const statusUpdatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await input.supabase
    .from("external_registrations")
    .update({
      status: input.status,
      status_updated_at: statusUpdatedAt,
    })
    .eq("user_id", input.profileId)
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
        user_id: input.profileId,
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

/** Stamp "opened" after the organizer-site handoff. Never downgrade registered. */
export async function performMarkRegistrationOpened(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
}): Promise<ActionResult> {
  const allowed = await assertCanWriteRegistration(
    input.supabase,
    input.userId,
    input.profileId
  );
  if (!allowed.ok) return allowed;

  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await input.supabase
    .from("external_registrations")
    .select("status")
    .eq("user_id", input.profileId)
    .eq("competition_id", input.competitionId)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      error: "Could not save the registration status. Try again.",
    };
  }
  if (existing?.status === "registered") return { ok: true };

  if (!existing) {
    const { error: insertError } = await input.supabase
      .from("external_registrations")
      .insert({
        user_id: input.profileId,
        competition_id: input.competitionId,
        status: "opened",
        opened_at: now,
        status_updated_at: now,
      });
    if (insertError) {
      return {
        ok: false,
        error: "Could not save the registration status. Try again.",
      };
    }
    return { ok: true };
  }

  const { count, error: updateError } = await input.supabase
    .from("external_registrations")
    .update(
      {
        status: "opened",
        opened_at: now,
        status_updated_at: now,
      },
      { count: "exact" }
    )
    .eq("user_id", input.profileId)
    .eq("competition_id", input.competitionId);
  if (updateError || count !== 1) {
    return {
      ok: false,
      error: "Could not save the registration status. Try again.",
    };
  }
  return { ok: true };
}
