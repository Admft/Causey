import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

/**
 * Place / award / division for one entrant, shared by the website manage page
 * and the phone app so both grant the same access, write the same columns, and
 * notify the student and linked parents with the same words.
 * Competition staff may record anyone on the event; a coach who could invite a
 * student may record that student.
 */
export async function performRecordResult(input: {
  supabase: AuthedSupabase;
  userId: string;
  competitionId: string;
  profileId: string;
  eventSlug: string;
  sectionId: string | null;
  placement: number | null;
  awardLabel: string | null;
}): Promise<ActionResult> {
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
        "Could not verify result recording access."
      ),
    };
  }
  if (!canManage) {
    return {
      ok: false,
      error: "Only competition staff can record a result.",
    };
  }

  const award =
    input.awardLabel && input.awardLabel.trim().length
      ? input.awardLabel.trim()
      : null;
  const hasPayload =
    input.sectionId !== null || input.placement !== null || award !== null;
  const { count, error } = await input.supabase
    .from("competition_entrants")
    .update(
      {
        section_id: input.sectionId,
        placement: input.placement,
        award_label: award,
        result_marked_by: hasPayload ? input.userId : null,
        result_marked_at: hasPayload ? new Date().toISOString() : null,
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
        "That result could not be saved.",
        "You don’t have permission to record a result for this student."
      ),
    };
  }

  if (!hasPayload) return { ok: true };

  const { data: competition } = await input.supabase
    .from("competitions")
    .select("name")
    .eq("id", input.competitionId)
    .maybeSingle();
  const eventName = competition?.name ?? "a tournament";
  const resultBits = [
    input.placement != null ? `Place ${input.placement}` : null,
    award,
  ].filter(Boolean);
  const resultBody = resultBits.length
    ? `${resultBits.join(" · ")} is now on Causey.`
    : "A division was recorded on Causey.";
  const studentNote =
    input.profileId === input.userId
      ? []
      : [
          {
            recipientId: input.profileId,
            kind: "result" as const,
            title: `Result recorded: ${eventName}`,
            body: resultBody,
            href: `/event/${input.eventSlug}`,
            entityType: "competition",
            entityId: input.competitionId,
            dedupeKey: `result:${input.competitionId}:${input.profileId}`,
          },
        ];

  const { data: guardianRows, error: guardianError } = await input.supabase.rpc(
    "get_active_guardians_for_profiles",
    { p_child_ids: [input.profileId] }
  );
  if (guardianError) {
    return {
      ok: false,
      error: "The result was saved, but linked parents could not be notified.",
    };
  }
  const parentNotes = (
    (guardianRows ?? []) as {
      child_id: string;
      parent_id: string;
      child_display_name: string;
    }[]
  )
    .map((row) => ({
      childId: row.child_id,
      parentId: row.parent_id,
      childDisplayName: row.child_display_name,
    }))
    .filter((guardian) => guardian.parentId !== input.userId)
    .map((guardian) => ({
      recipientId: guardian.parentId,
      kind: "result" as const,
      title: `${guardian.childDisplayName} · Result recorded: ${eventName}`,
      body: resultBody,
      href: "/family",
      entityType: "competition",
      entityId: input.competitionId,
      dedupeKey: `result:${input.competitionId}:${input.profileId}:parent:${guardian.parentId}`,
    }));

  const notifications = await createInAppNotifications(
    [...studentNote, ...parentNotes],
    { client: input.supabase }
  );
  if (notifications.failures.length) {
    return {
      ok: false,
      error: `The result was saved, but ${notifications.failures.length} in-app ${
        notifications.failures.length === 1 ? "update" : "updates"
      } could not be created.`,
    };
  }

  return { ok: true };
}
