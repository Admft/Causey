import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

export type AttendanceStatus = "attended" | "did_not_attend";

/**
 * Day-of attendance for one entrant, shared by the website manage page and the
 * phone app so both grant the same access and refuse with the same words.
 * Competition staff may mark anyone on the event; a coach who could invite a
 * student may mark that student.
 */
export async function performMarkAttendance(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  status: AttendanceStatus;
}): Promise<ActionResult> {
  if (input.status !== "attended" && input.status !== "did_not_attend") {
    return { ok: false, error: "Choose a valid attendance status." };
  }

  const [managementCheck, entrantCheck] = await Promise.all([
    input.supabase.rpc("can_manage_competition", {
      p_competition_id: input.competitionId,
      p_profile_id: input.userId,
    }),
    input.supabase.rpc("can_invite_to_competition", {
      p_competition_id: input.competitionId,
      p_entrant_id: input.profileId,
      p_inviter_id: input.userId,
    }),
  ]);
  const canManage = managementCheck.data === true || entrantCheck.data === true;
  if (!canManage && managementCheck.error && entrantCheck.error) {
    return {
      ok: false,
      error: actionErrorMessage(
        managementCheck.error,
        "Could not verify attendance management access."
      ),
    };
  }
  if (!canManage) {
    return { ok: false, error: "Only competition staff can record attendance." };
  }

  const { count, error } = await input.supabase
    .from("competition_entrants")
    .update(
      {
        status: input.status,
        attendance_marked_by: input.userId,
        attendance_marked_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That entrant was not found or attendance could not be saved.",
        "You don’t have permission to record attendance for this entrant."
      ),
    };
  }

  return { ok: true };
}
