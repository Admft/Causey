"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/actions/errors";
import { createInAppNotifications, getActiveGuardiansForProfiles } from "@/lib/actions/in-app-notifications";
import {
  getChildSchoolsForDistrict,
  getOrgRoster,
} from "@/lib/data/portal";
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
 * RSVP for yourself or (as a linked parent) for your child — RLS decides
 * which rows the update may touch, and responded_by must be the caller.
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
  const { data, error } = await supabase
    .from("competition_entrants")
    .update({
      status: input.status,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("competition_id", input.competitionId)
    .eq("profile_id", input.profileId)
    .select("profile_id, invited_by");
  if (error || !data?.length) {
    return { ok: false, error: "Could not save your RSVP." };
  }

  const invitedBy = data[0]?.invited_by as string | null | undefined;
  if (invitedBy && invitedBy !== user.id) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name, slug")
      .eq("id", input.competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    const slug = competition?.slug ?? input.eventSlug;
    const statusLabel = input.status === "going" ? "going" : "not going";
    const notifications = await createInAppNotifications([
      {
        recipientId: invitedBy,
        kind: "rsvp_update",
        title: `RSVP update: ${eventName}`,
        body: `Someone marked ${statusLabel}. Open the event roster to review.`,
        href: slug ? `/event/${slug}/manage` : "/orgs",
        entityType: "competition",
        entityId: input.competitionId,
        dedupeKey: `rsvp:${input.competitionId}:${input.profileId}:${input.status}`,
      },
    ]);
    if (notifications.failures.length) {
      revalidateEventSurfaces(input.eventSlug);
      return {
        ok: false,
        error: "Your RSVP was saved, but the coach update could not be created.",
      };
    }
  }

  revalidateEventSurfaces(input.eventSlug);
  return { ok: true };
}

export async function inviteEntrants(
  competitionId: string,
  eventSlug: string,
  profileIds: string[]
): Promise<ActionResult<{ invited: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const uniqueProfileIds = [...new Set(profileIds)];
  if (!uniqueProfileIds.length) return { ok: true, invited: 0 };

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("competition_entrants")
    .upsert(
      uniqueProfileIds.map((profileId) => ({
        competition_id: competitionId,
        profile_id: profileId,
        status: "invited",
        invited_by: user.id,
      })),
      { onConflict: "competition_id,profile_id", ignoreDuplicates: true }
    )
    .select("profile_id");
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

  const invitedIds = (data ?? []).map((row) => row.profile_id as string);
  if (invitedIds.length) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name")
      .eq("id", competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    const notifications = await createInAppNotifications(
      invitedIds
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
        error: `${invitedIds.length} ${
          invitedIds.length === 1 ? "invitation was" : "invitations were"
        } saved, but ${notifications.failures.length} in-app ${
          notifications.failures.length === 1 ? "update" : "updates"
        } could not be created.`,
      };
    }

    const guardians = await getActiveGuardiansForProfiles(invitedIds);
    if (guardians.error) {
      revalidateEventSurfaces(eventSlug);
      return {
        ok: false,
        error: `${invitedIds.length} ${
          invitedIds.length === 1 ? "invitation was" : "invitations were"
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
          error: `${invitedIds.length} ${
            invitedIds.length === 1 ? "invitation was" : "invitations were"
          } saved, but ${parentNotifications.failures.length} parent ${
            parentNotifications.failures.length === 1 ? "update" : "updates"
          } could not be created.`,
        };
      }
    }
  }

  revalidateEventSurfaces(eventSlug);
  return { ok: true, invited: invitedIds.length };
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
    .select("profile_id")
    .eq("group_id", groupId);
  if (error) {
    return {
      ok: false,
      error: "Could not load that group. Reload the page and try again.",
    };
  }

  return inviteEntrants(
    competitionId,
    eventSlug,
    (members ?? []).map((m) => m.profile_id)
  );
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

  const rosters = await Promise.all(
    schools.map((school) => getOrgRoster(school.id))
  );
  const profileIds = [
    ...new Set(
      rosters.flatMap((roster) =>
        roster
          .filter(
            (row) =>
              row.member_status === "active" && row.member_role === "student"
          )
          .map((row) => row.profile_id)
      )
    ),
  ];
  if (!profileIds.length) {
    return {
      ok: false,
      error:
        "Connected schools have no students on roster yet. Share a school join link, then invite.",
    };
  }

  return inviteEntrants(competitionId, eventSlug, profileIds);
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
