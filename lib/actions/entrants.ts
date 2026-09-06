"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/actions/errors";
import { createInAppNotifications, getActiveGuardiansForProfiles } from "@/lib/actions/in-app-notifications";
import { getChildSchoolsForDistrict } from "@/lib/data/portal";
import { performClearRsvp, performSetRsvp } from "@/lib/rsvp-write";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

function revalidateEventSurfaces(eventSlug?: string) {
  revalidatePath("/me");
  revalidatePath("/orgs");
  revalidatePath("/family");
  revalidatePath("/me/notifications");
  if (eventSlug) {
    revalidatePath(`/event/${eventSlug}`);
    revalidatePath(`/event/${eventSlug}/manage`);
  }
}

/**
 * RSVP for yourself or (as a linked parent) for your child. Updates an
 * existing invite row, or inserts going/not_going on a published public
 * listing when none exists. responded_by must be the caller.
 */
export async function setRsvp(input: {
  competitionId: string;
  profileId: string;
  status: "going" | "not_going";
  eventSlug?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to RSVP." };
  if (input.status !== "going" && input.status !== "not_going") {
    return { ok: false, error: "Pick going or not going." };
  }

  const supabase = await createServerSupabaseClient();
  const result = await performSetRsvp({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    profileId: input.profileId,
    status: input.status,
    eventSlug: input.eventSlug,
  });
  if (
    result.ok ||
    result.error ===
      "Your RSVP was saved, but the coach update could not be created."
  ) {
    revalidateEventSurfaces(input.eventSlug);
  }
  return result;
}

export async function clearRsvp(input: {
  competitionId: string;
  profileId: string;
  eventSlug?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to RSVP." };

  const supabase = await createServerSupabaseClient();
  const result = await performClearRsvp({
    supabase,
    userId: user.id,
    competitionId: input.competitionId,
    profileId: input.profileId,
    eventSlug: input.eventSlug,
  });
  if (
    result.ok ||
    result.error ===
      "Your RSVP was saved, but the coach update could not be created."
  ) {
    revalidateEventSurfaces(input.eventSlug);
  }
  return result;
}

/**
 * Coach / school-admin team entry: mark a rostered student going or not going
 * when the family has not answered. Audited as response_source = staff.
 * Assistants stay read-only at the RLS boundary.
 */
export async function markEntrantStaffRsvp(input: {
  competitionId: string;
  profileId: string;
  eventSlug: string;
  status: "going" | "not_going";
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  if (input.status !== "going" && input.status !== "not_going") {
    return { ok: false, error: "Pick going or not going." };
  }
  if (input.profileId === user.id) {
    return setRsvp({
      competitionId: input.competitionId,
      profileId: input.profileId,
      status: input.status,
      eventSlug: input.eventSlug,
    });
  }

  const supabase = await createServerSupabaseClient();
  const [managementCheck, entrantCheck] = await Promise.all([
    supabase.rpc("can_manage_competition", {
      p_competition_id: input.competitionId,
      p_profile_id: user.id,
    }),
    supabase.rpc("can_invite_to_competition", {
      p_competition_id: input.competitionId,
      p_entrant_id: input.profileId,
      p_inviter_id: user.id,
    }),
  ]);
  const canManage = managementCheck.data === true || entrantCheck.data === true;
  if (!canManage && managementCheck.error && entrantCheck.error) {
    return {
      ok: false,
      error: actionErrorMessage(
        managementCheck.error,
        "Could not verify staff entry access."
      ),
    };
  }
  if (!canManage) {
    return {
      ok: false,
      error: "Only coaches and administrators can mark a student going.",
    };
  }

  const { data, error } = await supabase
    .from("competition_entrants")
    .update({
      status: input.status,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
      response_source: "staff",
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .in("status", ["invited", "going", "not_going"])
    .select("profile_id");
  if (error || !data?.length) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That reply could not be saved. Reload and try again.",
        "You don’t have permission to mark this student going."
      ),
    };
  }

  const { data: competition } = await supabase
    .from("competitions")
    .select("name, slug")
    .eq("id", input.competitionId)
    .maybeSingle();
  const eventName = competition?.name ?? "a tournament";
  const slug = competition?.slug ?? input.eventSlug;
  const statusLabel = input.status === "going" ? "going" : "not going";

  const studentNote = [
    {
      recipientId: input.profileId,
      kind: "rsvp_update" as const,
      title: `Staff marked you ${statusLabel}: ${eventName}`,
      body:
        input.status === "going"
          ? "A coach marked you going. You or a linked parent can still change this on the event page."
          : "A coach marked you not going. You or a linked parent can still change this on the event page.",
      href: `/event/${slug}`,
      entityType: "competition",
      entityId: input.competitionId,
      dedupeKey: `staff-rsvp:${input.competitionId}:${input.profileId}:${input.status}`,
    },
  ];
  const guardians = await getActiveGuardiansForProfiles([input.profileId]);
  if (guardians.error) {
    revalidateEventSurfaces(input.eventSlug);
    return {
      ok: false,
      error:
        "The reply was saved, but linked parents could not be notified.",
    };
  }
  const parentNotes = guardians.guardians
    .filter((guardian) => guardian.parentId !== user.id)
    .map((guardian) => ({
      recipientId: guardian.parentId,
      kind: "rsvp_update" as const,
      title: `${guardian.childDisplayName} marked ${statusLabel} by staff · ${eventName}`,
      body:
        input.status === "going"
          ? `${guardian.childDisplayName} was marked going by a coach. Open the family desk to review or change the answer.`
          : `${guardian.childDisplayName} was marked not going by a coach. Open the family desk to review or change the answer.`,
      href: "/family",
      entityType: "competition",
      entityId: input.competitionId,
      dedupeKey: `staff-rsvp:${input.competitionId}:${input.profileId}:parent:${guardian.parentId}:${input.status}`,
    }));
  const notifications = await createInAppNotifications([
    ...studentNote,
    ...parentNotes,
  ]);
  if (notifications.failures.length) {
    revalidateEventSurfaces(input.eventSlug);
    return {
      ok: false,
      error: `The reply was saved, but ${notifications.failures.length} in-app ${
        notifications.failures.length === 1 ? "update" : "updates"
      } could not be created.`,
    };
  }

  revalidateEventSurfaces(input.eventSlug);
  return { ok: true };
}

export async function inviteEntrants(
  competitionId: string,
  eventSlug: string,
  profileIds: string[],
  originByProfile?: Record<string, string>
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const uniqueProfileIds = [...new Set(profileIds)];
  if (!uniqueProfileIds.length) return { ok: true, invited: 0 };

  const supabase = await createServerSupabaseClient();
  const { data: hostRow } = await supabase
    .from("competitions")
    .select("org_id, organizations!competitions_org_id_fkey(type)")
    .eq("id", competitionId)
    .maybeSingle();
  const hostRelation = hostRow?.organizations as
    | { type?: string }
    | { type?: string }[]
    | null
    | undefined;
  const hostType = Array.isArray(hostRelation)
    ? hostRelation[0]?.type
    : hostRelation?.type;
  const defaultOrigin =
    hostType && hostType !== "district" ? (hostRow?.org_id ?? null) : null;

  const invitedIds: string[] = [];
  const INVITE_CHUNK = 200;
  for (let start = 0; start < uniqueProfileIds.length; start += INVITE_CHUNK) {
    const chunk = uniqueProfileIds.slice(start, start + INVITE_CHUNK);
    const { error } = await supabase.from("competition_entrants").upsert(
      chunk.map((profileId) => ({
        competition_id: competitionId,
        profile_id: profileId,
        status: "invited",
        invited_by: user.id,
        origin_org_id: originByProfile?.[profileId] ?? defaultOrigin,
      })),
      { onConflict: "competition_id,profile_id", ignoreDuplicates: true }
    );
    if (error) {
      return {
        ok: false,
        error: actionErrorMessage(
          error,
          "Could not send the invitations. Check your connection and try again.",
          "You don’t have permission to invite entrants to this competition."
        ),
      };
    }

    // ignoreDuplicates often returns an empty body even after a real insert.
    // Count and alert from the saved invited rows, not the upsert representation.
    const { data: saved, error: readError } = await supabase
      .from("competition_entrants")
      .select("profile_id")
      .eq("competition_id", competitionId)
      .eq("status", "invited")
      .eq("invited_by", user.id)
      .in("profile_id", chunk);
    if (readError) {
      return {
        ok: false,
        error: actionErrorMessage(
          readError,
          "Could not confirm the invitations. Check your connection and try again.",
          "You don’t have permission to invite entrants to this competition."
        ),
      };
    }
    for (const row of saved ?? []) {
      invitedIds.push(row.profile_id as string);
    }
  }
  const uniqueInvitedIds = [...new Set(invitedIds)];
  if (uniqueInvitedIds.length) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name")
      .eq("id", competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    const notifications = await createInAppNotifications(
      uniqueInvitedIds
        .filter((profileId) => profileId !== user.id)
        .map((profileId) => ({
          recipientId: profileId,
          kind: "invitation" as const,
          title: `Invitation: ${eventName}`,
          body: "A coach invited you. Respond going or not going on the event page.",
          href: `/event/${eventSlug}`,
          entityType: "competition",
          entityId: competitionId,
          dedupeKey: `invitation:${competitionId}:${profileId}`,
        }))
    );
    if (notifications.failures.length) {
      revalidateEventSurfaces(eventSlug);
      return {
        ok: false,
        error: `${uniqueInvitedIds.length} ${
          uniqueInvitedIds.length === 1 ? "invitation was" : "invitations were"
        } saved, but ${notifications.failures.length} in-app ${
          notifications.failures.length === 1 ? "update" : "updates"
        } could not be created.`,
      };
    }

    const guardians = await getActiveGuardiansForProfiles(uniqueInvitedIds);
    if (guardians.error) {
      revalidateEventSurfaces(eventSlug);
      return {
        ok: false,
        error: `${uniqueInvitedIds.length} ${
          uniqueInvitedIds.length === 1 ? "invitation was" : "invitations were"
        } saved, but linked parents could not be notified.`,
      };
    }
    const parentInputs = guardians.guardians
      .filter((guardian) => guardian.parentId !== user.id)
      .map((guardian) => ({
        recipientId: guardian.parentId,
        kind: "invitation" as const,
        title: `Invitation: ${guardian.childDisplayName} · ${eventName}`,
        body: `${guardian.childDisplayName} was invited. Open the family desk to answer for them.`,
        href: "/family#needs-response",
        entityType: "competition",
        entityId: competitionId,
        dedupeKey: `invitation:${competitionId}:${guardian.childId}:parent:${guardian.parentId}`,
      }));
    if (parentInputs.length) {
      const parentNotifications = await createInAppNotifications(parentInputs);
      if (parentNotifications.failures.length) {
        revalidateEventSurfaces(eventSlug);
        return {
          ok: false,
          error: `${uniqueInvitedIds.length} ${
            uniqueInvitedIds.length === 1 ? "invitation was" : "invitations were"
          } saved, but ${parentNotifications.failures.length} parent ${
            parentNotifications.failures.length === 1 ? "update" : "updates"
          } could not be created.`,
        };
      }
    }
  }

  revalidateEventSurfaces(eventSlug);
  return { ok: true, invited: uniqueInvitedIds.length };
}

export async function inviteGroup(
  competitionId: string,
  eventSlug: string,
  groupId: string
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data: members, error } = await supabase
    .from("org_group_members")
    .select("profile_id, org_groups(org_id)")
    .eq("group_id", groupId);
  if (error) {
    return {
      ok: false,
      error: "Could not load that group. Reload the page and try again.",
    };
  }

  const originByProfile: Record<string, string> = {};
  const profileIds: string[] = [];
  for (const row of members ?? []) {
    const profileId = row.profile_id as string;
    profileIds.push(profileId);
    const group = row.org_groups as { org_id?: string } | { org_id?: string }[] | null;
    const orgId = Array.isArray(group) ? group[0]?.org_id : group?.org_id;
    if (orgId && !originByProfile[profileId]) {
      originByProfile[profileId] = orgId;
    }
  }

  return inviteEntrants(competitionId, eventSlug, profileIds, originByProfile);
}

export async function inviteConnectedSchoolRosters(
  competitionId: string,
  eventSlug: string
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data: canManage, error: manageError } = await supabase.rpc(
    "can_manage_competition",
    {
      p_competition_id: competitionId,
      p_profile_id: user.id,
    }
  );
  if (manageError || canManage !== true) {
    return {
      ok: false,
      error: "You don’t have permission to invite students to this competition.",
    };
  }

  const { data: competition } = await supabase
    .from("competitions")
    .select("org_id")
    .eq("id", competitionId)
    .maybeSingle();
  if (!competition?.org_id) {
    return {
      ok: false,
      error: "This competition is not hosted by a district.",
    };
  }

  const { data: host } = await supabase
    .from("organizations")
    .select("id, type")
    .eq("id", competition.org_id)
    .maybeSingle();
  if (host?.type !== "district") {
    return {
      ok: false,
      error: "Invite connected schools only works on a district-hosted event.",
    };
  }

  const schools = await getChildSchoolsForDistrict(host.id);
  if (!schools.length) {
    return {
      ok: false,
      error: "Add a school, then invite its roster.",
    };
  }

  const { data: profileRows, error: rosterError } = await supabase.rpc(
    "list_connected_school_student_ids",
    { p_district_id: host.id }
  );
  if (rosterError) {
    return {
      ok: false,
      error: actionErrorMessage(
        rosterError,
        "Could not load connected-school rosters. Reload and try again.",
        "You don’t have permission to invite students to this competition."
      ),
    };
  }
  const originByProfile: Record<string, string> = {};
  const profileIds: string[] = [];
  for (const row of (profileRows ?? []) as {
    profile_id: string;
    school_id?: string;
  }[]) {
    if (originByProfile[row.profile_id]) continue;
    profileIds.push(row.profile_id);
    if (row.school_id) originByProfile[row.profile_id] = row.school_id;
  }
  if (!profileIds.length) {
    return {
      ok: false,
      error:
        "Connected schools have no students on roster yet. Share a school join link, then invite.",
    };
  }

  return inviteEntrants(competitionId, eventSlug, profileIds, originByProfile);
}

export async function removeEntrant(
  competitionId: string,
  eventSlug: string,
  profileId: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("competition_entrants")
    .delete({ count: "exact" })
    .eq("competition_id", competitionId)
    .eq("profile_id", profileId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That entrant was not found or could not be removed.",
        "You don’t have permission to remove this entrant."
      ),
    };
  }

  revalidateEventSurfaces(eventSlug);
  return { ok: true };
}
