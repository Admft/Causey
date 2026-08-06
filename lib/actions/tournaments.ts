"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { canCreateOrg } from "@/lib/org-permissions";
import {
  getTournamentZip,
  insertTournamentRecord,
  updateTournamentRecord,
} from "@/lib/data/tournament-mutations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import {
  TournamentCreateSchema,
  TournamentUpdateSchema,
  type TournamentCreateInput,
  type TournamentUpdateInput,
} from "@/lib/validation/tournament";

export type { TournamentCreateInput, TournamentUpdateInput };

export async function createTournament(
  input: TournamentCreateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = TournamentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach / organizer accounts can create tournaments." };
  }

  const supabase = await createServerSupabaseClient();

  // Defense-in-depth: RLS also requires coach powers on the org.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, created_by")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };

  const zipResult = await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;

  const result = await insertTournamentRecord({
    supabase,
    values,
    orgName: org.name,
    profileId: profile.id,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
    status: "published",
  });
  if (!result.ok) return result;

  if (values.visibility === "public") revalidatePath("/chess");
  revalidatePath(`/orgs/${values.orgSlug}`);
  return result;
}

/** Edit a hosted tournament. The slug never changes — shared links stay live. */
export async function updateTournament(
  input: TournamentUpdateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = TournamentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const supabase = await createServerSupabaseClient();
  const zipResult = await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;
  const result = await updateTournamentRecord({
    supabase,
    values,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
  });
  if (!result.ok) return result;

  revalidatePath("/chess");
  revalidatePath(`/event/${values.eventSlug}`);
  revalidatePath(`/event/${values.eventSlug}/manage`);
  revalidatePath(`/orgs/${values.orgSlug}`);
  return result;
}

/** Cancel = archive. The event disappears for everyone, including the coach. */
export async function cancelTournament(input: {
  competitionId: string;
  eventSlug: string;
  orgSlug: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  // No RETURNING: an archived row is no longer SELECT-visible (even to its
  // coach), so confirm via the affected-row count instead.
  const { count, error } = await supabase
    .from("competitions")
    .update({ status: "archived" }, { count: "exact" })
    .eq("id", input.competitionId);
  if (error || !count) {
    return { ok: false, error: "Could not cancel the tournament." };
  }

  revalidatePath("/chess");
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/orgs/${input.orgSlug}`);
  return { ok: true };
}
