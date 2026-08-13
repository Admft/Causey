"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

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

  // #region agent log
  const { debugAgentLog, debugOperatorPermissions } = await import(
    "@/lib/debug/operator-permissions"
  );
  const perms = await debugOperatorPermissions(supabase, user.id, input.orgId);
  debugAgentLog({
    hypothesisId: "E",
    location: "lib/actions/attendance.ts:setOrgAttendance",
    message: "org attendance permission snapshot",
    data: {
      attending: input.attending,
      competitionId: input.competitionId,
      ...perms,
    },
  });
  // #endregion

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
      // #region agent log
      debugAgentLog({
        hypothesisId: "E",
        location: "lib/actions/attendance.ts:setOrgAttendance:upsert",
        message: "org attendance upsert failed",
        data: { code: error.code, err: error.message, ...perms },
      });
      // #endregion
      return { ok: false, error: "Could not mark your organization as attending." };
    }
  } else {
    const { error } = await supabase
      .from("org_competition_attendance")
      .delete()
      .eq("org_id", input.orgId)
      .eq("competition_id", input.competitionId);
    if (error) {
      // #region agent log
      debugAgentLog({
        hypothesisId: "E",
        location: "lib/actions/attendance.ts:setOrgAttendance:delete",
        message: "org attendance delete failed",
        data: { code: error.code, err: error.message, ...perms },
      });
      // #endregion
      return { ok: false, error: "Could not remove the attendance mark." };
    }
  }

  revalidatePath(`/orgs/${input.orgSlug}`);
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/event/${input.eventSlug}/manage`);
  return { ok: true };
}
