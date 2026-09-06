"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { performSetOrgAttendance } from "@/lib/org-attendance-write";

/**
 * Mark (or unmark) one of the coach's orgs as attending a public event.
 * Unmarking keeps existing entrant rows — invites already sent stand.
 */
export async function setOrgAttendance(input: {
  orgId: string;
  orgSlug: string;
  competitionId: string;
  eventSlug: string;
  attending: boolean;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const result = await performSetOrgAttendance({
    supabase,
    userId: user.id,
    orgId: input.orgId,
    competitionId: input.competitionId,
    attending: input.attending,
  });
  if (!result.ok) return result;

  revalidatePath(`/orgs/${result.orgSlug}`);
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/event/${input.eventSlug}/manage`);
  return { ok: true };
}
