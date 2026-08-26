"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { parseCompetitionCommentBody } from "@/lib/competition-comments";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function postCompetitionComment(input: {
  competitionId: string;
  eventSlug: string;
  body: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to comment." };

  const body = parseCompetitionCommentBody(input.body);
  if (!body) {
    return {
      ok: false,
      error: "Write a comment up to 800 characters.",
    };
  }

  const allowed = await consumeRateLimit(
    "comment",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("competition_comments").insert({
    competition_id: input.competitionId,
    user_id: user.id,
    body,
    author_label: "Member",
  });
  if (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Could not post the comment."),
    };
  }

  revalidatePath(`/event/${input.eventSlug}`);
  return { ok: true };
}

export async function deleteCompetitionComment(input: {
  commentId: string;
  eventSlug: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to remove a comment." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competition_comments")
    .delete()
    .eq("id", input.commentId)
    .select("id");
  if (error || !data?.length) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Could not remove that comment."),
    };
  }

  revalidatePath(`/event/${input.eventSlug}`);
  return { ok: true };
}
