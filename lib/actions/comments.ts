"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import { canPostPublicComments } from "@/lib/auth/age-band";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { parseCompetitionCommentBody } from "@/lib/competition-comments";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function commentWriteError(
  error: { code?: string | null; message?: string | null } | null,
  fallback: string
): string {
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("comment_under_13") || message.includes("comment_age_required")) {
    return "Comments are for ages 13 and up.";
  }
  if (message.includes("comment_report_own")) {
    return "You can remove your own comment instead of reporting it.";
  }
  if (message.includes("comment_not_found")) {
    return "That comment is no longer available.";
  }
  return actionErrorMessage(error, fallback);
}

export async function postCompetitionComment(input: {
  competitionId: string;
  eventSlug: string;
  body: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to comment." };
  const profile = await getCurrentProfile();
  if (!profile || !canPostPublicComments(profile)) {
    return { ok: false, error: "Comments are for ages 13 and up." };
  }

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
      error: commentWriteError(error, "Could not post the comment."),
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

export async function reportCompetitionComment(input: {
  commentId: string;
  eventSlug: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to report a comment." };

  const allowed = await consumeRateLimit(
    "comment",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("report_competition_comment", {
    p_comment_id: input.commentId,
  });
  if (error) {
    return {
      ok: false,
      error: commentWriteError(error, "Could not report that comment."),
    };
  }

  revalidatePath(`/event/${input.eventSlug}`);
  return { ok: true };
}
