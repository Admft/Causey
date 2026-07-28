/**
 * Organization / household types for multi-tenant competitions.
 * Tables land via supabase/migrations/0010–0012.
 */

export type OrganizationType = "school" | "club" | "team" | "district";
export type OrgMemberRole = "student" | "coach" | "admin";
export type OrgMemberStatus = "active" | "invited" | "removed";
export type CompetitionVisibility = "public" | "private";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  state: string | null;
  created_by: string | null;
  join_code: string | null;
  join_code_rotated_at: string | null;
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

export type EntrantStatus = "invited" | "going" | "not_going";

export type CompetitionEntrant = {
  competition_id: string;
  profile_id: string;
  status: EntrantStatus;
  invited_by: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
};

export type HouseholdLinkStatus = "pending" | "active" | "revoked";

export type HouseholdLink = {
  parent_profile_id: string;
  child_profile_id: string;
  status: HouseholdLinkStatus;
  created_at: string;
};

/** Return shape of the get_org_roster RPC (deliberately PII-light). */
export type RosterRow = {
  profile_id: string;
  display_name: string;
  age_band: string | null;
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
};

export const ORG_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "club", label: "Club" },
  { value: "team", label: "Team" },
  { value: "district", label: "District" },
];
