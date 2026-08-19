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
