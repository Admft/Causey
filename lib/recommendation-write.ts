import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

const NOTE_MAX = 280;

export async function performSendRecommendation(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  toProfileIds: string[];
  note: string;
}): Promise<ActionResult<{ sent: number; toProfileIds: string[] }>> {
  const toProfileIds = [...new Set(input.toProfileIds)];
  if (!toProfileIds.length) {
    return { ok: false, error: "Pick at least one person." };
  }
  const note = input.note.trim();
  if (note.length > NOTE_MAX) {
    return { ok: false, error: "Keep the note under 280 characters." };
  }

  const { error } = await input.supabase.from("event_recommendations").upsert(
    toProfileIds.map((toProfileId) => ({
      competition_id: input.competitionId,
      from_profile_id: input.userId,
      to_profile_id: toProfileId,
      note: note || null,
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

  const { data: saved, error: readError } = await input.supabase
    .from("event_recommendations")
    .select("to_profile_id")
    .eq("competition_id", input.competitionId)
    .eq("from_profile_id", input.userId)
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
      error:
        "Could not send the recommendation. You can only recommend competitions to connected accounts.",
    };
  }

  const alertOutcomes = await Promise.all(
    savedIds.map((toProfileId) =>
      input.supabase.rpc("notify_event_recommendation", {
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

  return { ok: true, sent: savedIds.length, toProfileIds: savedIds };
}

export async function performDismissRecommendation(input: {
  supabase: AuthedSupabase;
  userId: string;
  id: string;
}): Promise<ActionResult> {
  const { data, error } = await input.supabase
    .from("event_recommendations")
    .update({ status: "dismissed" })
    .eq("id", input.id)
    .eq("to_profile_id", input.userId)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not dismiss this." };
  }
  return { ok: true };
}
