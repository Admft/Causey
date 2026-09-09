import type { DistrictAdminActivityRow } from "@/lib/data/district";

const ROLE_LABELS: Record<string, string> = {
  assistant_coach: "assistant coach",
  coach: "coach",
  school_admin: "school administrator",
  district_admin: "district administrator",
  student: "student",
};

const ACTION_LABELS: Record<string, string> = {
  "organization.created": "Workspace created",
  "organization.settings_changed": "Settings updated",
  "organization.invitation_created": "Staff invitation sent",
  "organization.invitation_claimed": "Invitation claimed",
  "organization.invitation_revoked": "Invitation revoked",
  "organization.invitation_expired": "Invitation expired",
  "organization.announcement_published": "Announcement published",
  "competition.created": "Competition created",
  "competition.status_changed": "Competition status changed",
};

export type DistrictActivityFollowThrough = {
  href: string;
  label: string;
};

export type DistrictActivityFollowThroughContext = {
  districtSlug: string;
  districtOrgId: string;
  /** Org id → workspace slug for the district and every connected school. */
  slugByOrgId: ReadonlyMap<string, string>;
};

/**
 * One next action from an Activity row into the scoped workspace.
 * Uses only ids already on the row — never invents competition or student links.
 */
export function districtActivityFollowThrough(
  row: DistrictAdminActivityRow,
  ctx: DistrictActivityFollowThroughContext
): DistrictActivityFollowThrough | null {
  const scopeSlug = ctx.slugByOrgId.get(row.scope_org_id);
  if (!scopeSlug) return null;

  const isSchool = row.scope_org_type === "school";
  const openWorkspace: DistrictActivityFollowThrough = {
    href: `/orgs/${scopeSlug}`,
    label: isSchool ? "Open school" : "Open district overview",
  };

  if (row.action.startsWith("competition.")) {
    return {
      href: `/orgs/${ctx.districtSlug}/competitions?host=${encodeURIComponent(
        row.scope_org_id
      )}`,
      label: "Review competitions",
    };
  }

  if (row.action.startsWith("organization.invitation_")) {
    return {
      href: `/orgs/${scopeSlug}/people`,
      label: "Open People",
    };
  }

  if (row.action === "organization.settings_changed") {
    const summary = row.summary ?? {};
    if (summary.owner_changed) {
      return {
        href: `/orgs/${scopeSlug}/settings#ownership`,
        label: "Open ownership settings",
      };
    }
    if (summary.verification_from || summary.verification_to) {
      return {
        href: `/orgs/${scopeSlug}/settings#verification`,
        label: "Open verification settings",
      };
    }
    return {
      href: `/orgs/${scopeSlug}/settings`,
      label: "Open settings",
    };
  }

  if (row.action === "organization.announcement_published") {
    return openWorkspace;
  }

  if (row.action === "organization.created") {
    return openWorkspace;
  }

  return openWorkspace;
}

/** Competitions inventory filtered to one host (district or school). */
export function districtHostCompetitionsHref(
  districtSlug: string,
  hostOrgId: string
): string {
  return `/orgs/${districtSlug}/competitions?host=${encodeURIComponent(
    hostOrgId
  )}`;
}

/** School workspace overview when the slug is known; otherwise null. */
export function districtReportSchoolHref(
  schoolId: string,
  slugByOrgId: ReadonlyMap<string, string>
): string | null {
  const slug = slugByOrgId.get(schoolId);
  return slug ? `/orgs/${slug}` : null;
}

export function districtActivityActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? "Administrative update";
}

export function districtActivityDetail(
  row: DistrictAdminActivityRow
): string | null {
  const summary = row.summary ?? {};
  const parts: string[] = [];

  if (summary.role) {
    parts.push(`Role: ${ROLE_LABELS[summary.role] ?? summary.role}`);
  }
  if (summary.verification_from || summary.verification_to) {
    parts.push(
      `Verification: ${summary.verification_from ?? "unknown"} → ${
        summary.verification_to ?? "unknown"
      }`
    );
  }
  if (summary.owner_changed) {
    parts.push("Ownership changed");
  }
  if (summary.parent_changed) {
    parts.push("District connection changed");
  }
  if (summary.title) {
    parts.push(`“${summary.title}”`);
  }
  if (summary.name && row.action.startsWith("competition.")) {
    parts.push(summary.name);
  }
  if (summary.from || summary.to) {
    parts.push(
      `Status: ${summary.from ?? "unknown"} → ${summary.to ?? "unknown"}`
    );
  }
  if (summary.visibility) {
    parts.push(`Audience: ${summary.visibility}`);
  }

  return parts.length ? parts.join(" · ") : null;
}

export function formatDistrictActivityWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
