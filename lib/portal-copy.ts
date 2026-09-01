import { homePathForRole } from "@/lib/auth/home-path";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Shared portal vocabulary so empty/error/success CTAs match AuthNav terms.
 *
 * Public discovery keeps “tournaments.” Organization workspaces use
 * “competitions” to match OrgSubnav.
 */

export const SEARCH_TOURNAMENTS_LABEL = "Search tournaments";
export const OPEN_COMPETITIONS_LABEL = "Open competitions";
export const OPEN_MY_CLUBS_LABEL = "Open my clubs";
export const OPEN_MY_ORGANIZATIONS_LABEL = "Open my organizations";
export const CREATE_ORGANIZATION_LABEL = "Create an organization";

/** Plain noun for copy: club, team, school, or district. */
export function organizationKindLabel(
  type: string
): "club" | "team" | "school" | "district" {
  if (type === "team" || type === "school" || type === "district") return type;
  return "club";
}

/** Title-case noun for eyebrows and short labels. */
export function organizationKindTitle(
  type: string
): "Club" | "Team" | "School" | "District" {
  const kind = organizationKindLabel(type);
  return (kind.charAt(0).toUpperCase() + kind.slice(1)) as
    | "Club"
    | "Team"
    | "School"
    | "District";
}

/** Roster student-history eyebrow: School record / Club record / Team record. */
export function membershipHistoryEyebrow(type: string): string {
  return `${organizationKindTitle(type)} record`;
}

export type StudentOrgChrome = {
  heading: string;
  openLabel: string;
  openOneLabel: string;
  joinAnotherLabel: string;
  emptyJoinTitle: string;
  emptyJoinDescription: string;
  onRosterDescription: string;
  invitationsWaitDescription: string;
  parentVisibility: string;
  rsvpExplainer: string;
  leftBanner: string;
  notYetMembership: string;
  codesAndMembershipDescription: string;
  openRosterDescription: string;
  familyRsvpMission: string;
};

/**
 * Student / family chrome from membership types.
 * Empty memberships stay school-or-club honest for district pilots.
 * School-only and club/team-only get matching nouns; mixed uses organizations.
 */
export function studentOrgChromeFromTypes(
  types: Iterable<string>
): StudentOrgChrome {
  const kinds = new Set(
    [...types]
      .map((t) => organizationKindLabel(t))
      .filter((k) => k === "school" || k === "club" || k === "team")
  );
  const hasSchool = kinds.has("school");
  const hasClubOrTeam = kinds.has("club") || kinds.has("team");

  if (hasSchool && !hasClubOrTeam) {
    return {
      heading: "Your schools",
      openLabel: "Open my schools",
      openOneLabel: "Open school",
      joinAnotherLabel: "Join another school",
      emptyJoinTitle: "Join your school or club",
      emptyJoinDescription:
        "Ask your coach for a join code and enter it below.",
      onRosterDescription:
        "You’re on a school roster. Search public events, or wait here for school invitations.",
      invitationsWaitDescription:
        "Ask your coach for a join link or code. School invitations and RSVPs show up here after you join.",
      parentVisibility: "see your schools and help with RSVPs",
      rsvpExplainer:
        "RSVP tells your school who is coming. Organizer registration and payment still happen on the event’s own site when a link is listed.",
      leftBanner:
        "You left that school. Join another with a code below, or",
      notYetMembership: "Not in a school yet.",
      codesAndMembershipDescription:
        "Answer on your tournament plan, then come back here for school codes and membership.",
      openRosterDescription:
        "Open a school to see teammates and public org pages. Use a join code to add another.",
      familyRsvpMission:
        "RSVPs tell the school who’s coming; organizer registration finishes entry on the tournament site.",
    };
  }

  if (!hasSchool && hasClubOrTeam) {
    return {
      heading: "Your clubs",
      openLabel: OPEN_MY_CLUBS_LABEL,
      openOneLabel: "Open club",
      joinAnotherLabel: "Join another club",
      emptyJoinTitle: "Join your school or club",
      emptyJoinDescription:
        "Ask your coach for a join code and enter it below.",
      onRosterDescription:
        "You’re on a roster. Search public events, or wait here for club invitations.",
      invitationsWaitDescription:
        "Ask your coach for a join link or code. Club invitations and RSVPs show up here after you join.",
      parentVisibility: "see your clubs and help with RSVPs",
      rsvpExplainer:
        "RSVP tells your club who is coming. Organizer registration and payment still happen on the event’s own site when a link is listed.",
      leftBanner: "You left that club. Join another with a code below, or",
      notYetMembership: "Not in a club yet.",
      codesAndMembershipDescription:
        "Answer on your tournament plan, then come back here for club codes and membership.",
      openRosterDescription:
        "Open a club to see teammates and public org pages. Use a join code to add another.",
      familyRsvpMission:
        "RSVPs tell the club who’s coming; organizer registration finishes entry on the tournament site.",
    };
  }

  if (hasSchool && hasClubOrTeam) {
    return {
      heading: "Your organizations",
      openLabel: OPEN_MY_ORGANIZATIONS_LABEL,
      openOneLabel: "Open organization",
      joinAnotherLabel: "Join another organization",
      emptyJoinTitle: "Join your school or club",
      emptyJoinDescription:
        "Ask your coach for a join code and enter it below.",
      onRosterDescription:
        "You’re on a roster. Search public events, or wait here for school and club invitations.",
      invitationsWaitDescription:
        "Ask your coach for a join link or code. School and club invitations and RSVPs show up here after you join.",
      parentVisibility: "see your schools and clubs and help with RSVPs",
      rsvpExplainer:
        "RSVP tells your school or club who is coming. Organizer registration and payment still happen on the event’s own site when a link is listed.",
      leftBanner:
        "You left that organization. Join another with a code below, or",
      notYetMembership: "Not in a school or club yet.",
      codesAndMembershipDescription:
        "Answer on your tournament plan, then come back here for join codes and membership.",
      openRosterDescription:
        "Open a school or club to see teammates and public org pages. Use a join code to add another.",
      familyRsvpMission:
        "RSVPs tell the school or club who’s coming; organizer registration finishes entry on the tournament site.",
    };
  }

  // No memberships yet — district-honest default (schools and clubs).
  return {
    heading: "Your organizations",
    openLabel: OPEN_MY_ORGANIZATIONS_LABEL,
    openOneLabel: "Open organization",
    joinAnotherLabel: "Join with a code",
    emptyJoinTitle: "Join your school or club",
    emptyJoinDescription: "Ask your coach for a join code and enter it below.",
    onRosterDescription:
      "You’re on a roster. Search public events, or wait here for invitations.",
    invitationsWaitDescription:
      "Ask your coach for a join link or code. School and club invitations and RSVPs show up here after you join.",
    parentVisibility: "see your schools and clubs and help with RSVPs",
    rsvpExplainer:
      "RSVP tells your school or club who is coming. Organizer registration and payment still happen on the event’s own site when a link is listed.",
    leftBanner:
      "You left that organization. Join another with a code below, or",
    notYetMembership: "Not in a school or club yet.",
    codesAndMembershipDescription:
      "Answer on your tournament plan, then come back here for join codes and membership.",
    openRosterDescription:
      "Open a school or club to see teammates and public org pages. Use a join code to add another.",
    familyRsvpMission:
      "RSVPs tell the school or club who’s coming; organizer registration finishes entry on the tournament site.",
  };
}

/** Host workspace title for manage/edit. Club/team stay generic. */
export function manageEventTitle(
  orgType?: string | null
): "Manage event" | "Manage school event" | "Manage district event" {
  const kind = orgType ? organizationKindLabel(orgType) : "club";
  if (kind === "school") return "Manage school event";
  if (kind === "district") return "Manage district event";
  return "Manage event";
}

export type OrganizationNavAccess = {
  hasDistrictAccess?: boolean;
};

/** Primary header labels for the organizations portal link. */
export function organizationNavLabels(access: OrganizationNavAccess = {}): {
  label: string;
  shortLabel: string;
} {
  if (access.hasDistrictAccess) {
    return { label: "Districts & schools", shortLabel: "District" };
  }
  return { label: "My organizations", shortLabel: "Orgs" };
}

/**
 * Dominant “return to workspace” CTA after empty/error/success states.
 * Matches AuthNav role landings: Family, Plan, My organizations / Districts.
 */
export function workspaceOpenCta(
  role: AccountRole | string | null | undefined,
  access: OrganizationNavAccess = {}
): { href: string; label: string } {
  const href = homePathForRole(role);
  if (role === "parent") {
    return { href, label: "Open Family" };
  }
  if (role === "coach") {
    return {
      href,
      label: access.hasDistrictAccess
        ? "Open Districts & schools"
        : "Open my organizations",
    };
  }
  return { href, label: "Open Plan" };
}

/** Empty-state CTA for the Account → Organizations panel. */
export function accountOrganizationsEmptyCta(options: {
  role: AccountRole;
  canCreate: boolean;
  hasDistrictAccess?: boolean;
}): { href: string; label: string } {
  if (options.role === "student") {
    return { href: "/orgs", label: OPEN_MY_ORGANIZATIONS_LABEL };
  }
  if (options.hasDistrictAccess) {
    return { href: "/orgs", label: "Open Districts & schools" };
  }
  if (options.canCreate) {
    return { href: "/orgs/new", label: CREATE_ORGANIZATION_LABEL };
  }
  return { href: "/orgs", label: "Open my organizations" };
}

export function orgCompetitionsHref(orgSlug: string): string {
  return `/orgs/${orgSlug}/competitions`;
}
