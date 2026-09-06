"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import {
  performDismissRecommendation,
  performSendRecommendation,
} from "@/lib/recommendation-write";

const NoteSchema = z
  .string()
  .trim()
  .max(280, "Keep the note under 280 characters.");

function revalidateRecommendationSurfaces(eventSlug?: string) {
  revalidatePath("/me");
  revalidatePath("/me/notifications");
  revalidatePath("/orgs");
  revalidatePath("/family");
  if (eventSlug) revalidatePath(`/event/${eventSlug}`);
}

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
  const result = await performSendRecommendation({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    toProfileIds,
    note: note.data,
  });
  if (result.ok) revalidateRecommendationSurfaces(input.eventSlug);
  return result;
}

export async function dismissRecommendation(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const result = await performDismissRecommendation({
    supabase,
    userId: user.id,
    id,
  });
  if (result.ok) revalidateRecommendationSurfaces();
  return result;
}
