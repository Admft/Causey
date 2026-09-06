import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";

/**
 * Mark (or unmark) a roster-bearing org as attending a public event.
 * Unmarking keeps existing entrant rows — invites already sent stand.
 * Used by the website event page and the phone Bring-your-roster card.
 */
export async function performSetOrgAttendance(input: {
  supabase: AuthedSupabase;
  userId: string;
  orgId: string;
  competitionId: string;
  attending: boolean;
}): Promise<ActionResult<{ orgSlug: string }>> {
  const { data: organization, error: organizationError } = await input.supabase
    .from("organizations")
    .select("type, slug")
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
    const { error } = await input.supabase.from("org_competition_attendance").upsert(
      {
        org_id: input.orgId,
        competition_id: input.competitionId,
        created_by: input.userId,
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
    const { count, error } = await input.supabase
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

  return { ok: true, orgSlug: organization.slug as string };
}
