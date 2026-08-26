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
export const CREATE_ORGANIZATION_LABEL = "Create an organization";

/** Plain noun for copy: club, team, school, or district. */
export function organizationKindLabel(
  type: string
): "club" | "team" | "school" | "district" {
  if (type === "team" || type === "school" || type === "district") return type;
  return "club";
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
    return { href: "/orgs", label: OPEN_MY_CLUBS_LABEL };
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
