"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";

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
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", input.orgId)
    .maybeSingle();
  if (organizationError || !organization) {
    return {
      ok: false,
      error: "This organization is unavailable or you cannot manage it.",
    };
  }
  if (!canMarkOrganizationAttending(organization)) {
    return {
      ok: false,
      error:
        "District offices do not have student rosters. Mark a connected school as going instead.",
    };
  }

  if (input.attending) {
    const { error } = await supabase.from("org_competition_attendance").upsert(
      {
        org_id: input.orgId,
        competition_id: input.competitionId,
        created_by: user.id,
      },
      { onConflict: "org_id,competition_id", ignoreDuplicates: true }
    );
    if (error) {
      return {
        ok: false,
        error: actionErrorMessage(
          error,
          "Could not mark your organization as attending.",
          "You don’t have permission to manage attendance for this organization."
        ),
      };
    }
  } else {
    const { count, error } = await supabase
      .from("org_competition_attendance")
      .delete({ count: "exact" })
      .eq("org_id", input.orgId)
      .eq("competition_id", input.competitionId);
    if (error || count !== 1) {
      return {
        ok: false,
        error: actionErrorMessage(
          error,
          "The attendance mark was not found or could not be removed.",
          "You don’t have permission to manage attendance for this organization."
        ),
      };
    }
  }

  revalidatePath(`/orgs/${input.orgSlug}`);
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/event/${input.eventSlug}/manage`);
  return { ok: true };
}
