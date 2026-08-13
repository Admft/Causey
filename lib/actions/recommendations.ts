"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";

const NoteSchema = z
  .string()
  .trim()
  .max(280, "Keep the note under 280 characters.");

/**
 * Send an event to connected accounts (linked children, org-mates). RLS
 * verifies each connection; already-sent pairs are skipped, not overwritten.
 */
export async function sendRecommendation(input: {
  competitionId: string;
  eventSlug: string;
  toProfileIds: string[];
  note: string;
}): Promise<ActionResult<{ sent: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const toProfileIds = [...new Set(input.toProfileIds)];
  if (!toProfileIds.length) {
    return { ok: false, error: "Pick at least one person." };
  }
  const note = NoteSchema.safeParse(input.note);
  if (!note.success) {
    return { ok: false, error: note.error.issues[0]?.message ?? "Check the note." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("event_recommendations")
    .upsert(
      toProfileIds.map((toProfileId) => ({
        competition_id: input.competitionId,
        from_profile_id: user.id,
        to_profile_id: toProfileId,
        note: note.data || null,
      })),
      {
        onConflict: "competition_id,from_profile_id,to_profile_id",
        ignoreDuplicates: true,
      }
    )
    .select("id");
  if (error) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "Could not send the recommendation.",
        "You can only recommend competitions to connected accounts."
      ),
    };
  }

  revalidatePath("/orgs");
  revalidatePath("/family");
  revalidatePath(`/event/${input.eventSlug}`);
  return { ok: true, sent: data?.length ?? 0 };
}

export async function dismissRecommendation(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("event_recommendations")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("to_profile_id", user.id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not dismiss this." };
  }

  revalidatePath("/orgs");
  revalidatePath("/family");
  return { ok: true };
}
