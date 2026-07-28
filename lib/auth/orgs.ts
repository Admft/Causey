/**
 * Organization / household types for multi-tenant competitions.
 * Tables land via supabase/migrations/0010_organizations.sql.
 * Coach UI and invites come later — schema is ready first.
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
};

export type OrgMembership = {
  org_id: string;
  profile_id: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
};
