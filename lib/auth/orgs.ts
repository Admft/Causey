/**
 * Organization / household types for multi-tenant competitions.
 * Tables land via supabase/migrations/0010–0012.
 */

export type OrganizationType = "school" | "club" | "team" | "district";
export type OrgMemberRole =
  | "student"
  | "assistant_coach"
  | "coach"
  | "admin"
  | "school_admin"
  | "district_admin";
export type OrgMemberStatus = "active" | "invited" | "removed";
export type CompetitionVisibility = "public" | "private";
export type CompetitionAudience =
  | "public"
  | "district"
  | "school"
  | "invite_only";
export type OrganizationVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  state: string | null;
  created_by: string | null;
  owner_profile_id: string | null;
  parent_org_id: string | null;
  verification_status: OrganizationVerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  join_code: string | null;
  join_code_rotated_at: string | null;
  website_url: string | null;
  meeting_note: string | null;
};

export type OrgMembership = {
  org_id: string;
  profile_id: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  created_at: string;
};

export type OrgGroup = {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
};

export type EntrantStatus =
  | "invited"
  | "going"
  | "not_going"
  | "attended"
  | "did_not_attend";

export type CompetitionEntrant = {
  competition_id: string;
  profile_id: string;
  status: EntrantStatus;
  invited_by: string | null;
  responded_by: string | null;
  responded_at: string | null;
  attendance_marked_by: string | null;
  attendance_marked_at: string | null;
  section_id: string | null;
  placement: number | null;
  award_label: string | null;
  result_marked_by: string | null;
  result_marked_at: string | null;
  created_at: string;
};

export type HouseholdLinkStatus = "pending" | "active" | "revoked";

export type HouseholdLink = {
  parent_profile_id: string;
  child_profile_id: string;
  status: HouseholdLinkStatus;
  created_at: string;
};

export type CredentialIds = {
  uscf?: string;
  nsda?: string;
  other?: string;
};

/** Return shape of the get_org_roster RPC (deliberately PII-light). */
export type RosterRow = {
  profile_id: string;
  display_name: string;
  age_band: string | null;
  grade: number | null;
  credential_ids: CredentialIds;
  member_role: OrgMemberRole;
  member_status: OrgMemberStatus;
  joined_at: string;
};

/** Return shape of the get_event_attendance RPC. */
export type AttendanceRow = {
  profile_id: string;
  display_name: string;
  status: EntrantStatus;
  responded_at: string | null;
  member_status: OrgMemberStatus;
  section_id: string | null;
  section_name: string | null;
  placement: number | null;
  award_label: string | null;
  origin_org_id: string | null;
  origin_org_name: string | null;
};

/** Return shape of get_org_member_competition_history. */
export type MemberCompetitionHistoryRow = {
  competition_id: string;
  slug: string;
  name: string;
  category: string;
  start_date: string;
  end_date: string | null;
  status: EntrantStatus;
  section_name: string | null;
  placement: number | null;
  award_label: string | null;
};

export const ORG_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "club", label: "Club" },
  { value: "team", label: "Team" },
  { value: "district", label: "District" },
];

/** Coaches create clubs/teams themselves. Schools and districts are provisioned. */
export const COACH_SELF_SERVE_ORG_TYPES = ORG_TYPE_OPTIONS.filter(
  (option) => option.value === "club" || option.value === "team"
);

export const ORG_ROLE_LABELS: Record<OrgMemberRole, string> = {
  student: "Student",
  assistant_coach: "Assistant coach",
  coach: "Coach",
  admin: "Administrator",
  school_admin: "School administrator",
  district_admin: "District administrator",
};

export const COMPETITION_AUDIENCE_OPTIONS: {
  value: CompetitionAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can find it after Causey reviews the listing.",
  },
  {
    value: "district",
    label: "District only",
    description: "Students, families, and staff across the district can open it.",
  },
  {
    value: "school",
    label: "School only",
    description: "Only this school’s members, linked parents, and staff can open it.",
  },
  {
    value: "invite_only",
    label: "Invite only",
    description: "Only invited students, linked parents, and event staff can open it.",
  },
];
