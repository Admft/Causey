import type { AccountRole } from "@/lib/auth/types";
import type { EntrantStatus } from "@/lib/auth/orgs";

export type RsvpUiStatus = EntrantStatus | "unanswered";

export type EventRsvpTarget = {
  profileId: string;
  label: string;
  status: RsvpUiStatus;
};

/** Published public listings families can mark Going on without a club invite. */
export function allowsFamilyDiscoveryRsvp(competition: {
  status?: string | null;
  visibility?: string | null;
  audience?: string | null;
}): boolean {
  return (
    competition.status === "published" &&
    competition.visibility === "public" &&
    (competition.audience ?? "public") === "public"
  );
}

/**
 * Event-page RSVP people: existing entrant rows, plus unanswered children
 * (and an unanswered student self) on public discovery listings.
 */
export function buildEventRsvpTargets(input: {
  viewerId: string;
  viewerRole: AccountRole | null;
  children: { profile_id: string; display_name: string }[];
  entrants: { profile_id: string; status: EntrantStatus }[];
  familyDiscovery: boolean;
  ended: boolean;
}): EventRsvpTarget[] {
  const byProfile = new Map(
    input.entrants.map((row) => [row.profile_id, row])
  );
  const targets: EventRsvpTarget[] = [];
  const offerUnanswered = input.familyDiscovery && !input.ended;

  const self = byProfile.get(input.viewerId);
  if (self) {
    targets.push({
      profileId: input.viewerId,
      label: "You",
      status: self.status,
    });
  } else if (offerUnanswered && input.viewerRole === "student") {
    targets.push({
      profileId: input.viewerId,
      label: "You",
      status: "unanswered",
    });
  }

  for (const child of input.children) {
    const row = byProfile.get(child.profile_id);
    if (row) {
      targets.push({
        profileId: child.profile_id,
        label: child.display_name,
        status: row.status,
      });
    } else if (offerUnanswered) {
      targets.push({
        profileId: child.profile_id,
        label: child.display_name,
        status: "unanswered",
      });
    }
  }

  return targets;
}

export function organizerRegistrationProfileIds(input: {
  viewerId: string;
  childIds: string[];
  entrants: { profile_id: string; status: EntrantStatus }[];
}): string[] {
  const goingOrInvited = (status: EntrantStatus) =>
    status === "going" || status === "invited";
  const childIdSet = new Set(input.childIds);
  const fromChildren = input.entrants
    .filter(
      (row) => childIdSet.has(row.profile_id) && goingOrInvited(row.status)
    )
    .map((row) => row.profile_id);
  const self = input.entrants.find((row) => row.profile_id === input.viewerId);

  if (input.childIds.length) {
    const ids = [...fromChildren];
    if (self && goingOrInvited(self.status) && !ids.includes(input.viewerId)) {
      ids.unshift(input.viewerId);
    }
    return ids;
  }

  if (self && goingOrInvited(self.status)) return [input.viewerId];
  // Signed-in viewer with no club invite and no linked students: track them.
  return [input.viewerId];
}
