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
 *
 * Do not count rows from the upsert body: `ignoreDuplicates` often returns an
 * empty representation even when the insert succeeded, which showed “Sent to
 * 0 people” after a real send.
 */
export async function sendRecommendation(input: {
  competitionId: string;
  eventSlug: string;
  toProfileIds: string[];
  note: string;
}): Promise<ActionResult<{ sent: number; toProfileIds: string[] }>> {
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
  const { error } = await supabase.from("event_recommendations").upsert(
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
  );
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

  const { data: saved, error: readError } = await supabase
    .from("event_recommendations")
    .select("to_profile_id")
    .eq("competition_id", input.competitionId)
    .eq("from_profile_id", user.id)
    .in("to_profile_id", toProfileIds);
  if (readError) {
    return {
      ok: false,
      error: actionErrorMessage(
        readError,
        "Could not confirm the recommendation.",
        "You can only recommend competitions to connected accounts."
      ),
    };
  }
  const savedIds = [
    ...new Set((saved ?? []).map((row) => row.to_profile_id as string)),
  ];
  if (!savedIds.length) {
    return {
      ok: false,
      error: "Could not send the recommendation. You can only recommend competitions to connected accounts.",
    };
  }

  const alertOutcomes = await Promise.all(
    savedIds.map((toProfileId) =>
      supabase.rpc("notify_event_recommendation", {
        p_competition_id: input.competitionId,
        p_recipient_id: toProfileId,
      })
    )
  );
  if (alertOutcomes.some((outcome) => outcome.error)) {
    return {
      ok: false,
      error: actionErrorMessage(
        alertOutcomes.find((outcome) => outcome.error)?.error,
        "The recommendation was saved, but the alert could not be created.",
        "The recommendation was saved, but the alert could not be created."
      ),
    };
  }

  revalidatePath("/me");
  revalidatePath("/me/notifications");
  revalidatePath("/orgs");
  revalidatePath("/family");
  revalidatePath(`/event/${input.eventSlug}`);
  return { ok: true, sent: savedIds.length, toProfileIds: savedIds };
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

  revalidatePath("/me");
  revalidatePath("/me/notifications");
  revalidatePath("/orgs");
  revalidatePath("/family");
  return { ok: true };
}
