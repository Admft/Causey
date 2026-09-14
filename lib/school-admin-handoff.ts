/**
 * School People / overview “invite an administrator” is a district-office
 * job. A claimed school administrator already holds that seat and should
 * never be told to delegate the school to themselves.
 */

export function isSchoolAdministratorRole(
  role: string | null | undefined
): boolean {
  return role === "school_admin" || role === "admin";
}

export function viewerHoldsSchoolAdminSeat(
  membership:
    | {
        role?: string | null;
        status?: string | null;
      }
    | null
    | undefined
): boolean {
  if (!membership || membership.status === "removed") return false;
  return isSchoolAdministratorRole(membership.role);
}

export function countSchoolAdministrators(
  rows: Array<{
    org_id?: string | null;
    member_role: string;
    member_status: string;
  }>,
  orgId?: string | null
): number {
  return rows.filter((row) => {
    if (
      orgId != null &&
      row.org_id != null &&
      String(row.org_id) !== String(orgId)
    ) {
      return false;
    }
    if (row.member_status === "removed") return false;
    return isSchoolAdministratorRole(row.member_role);
  }).length;
}

export function schoolNeedsAdministratorInvite(options: {
  orgType: string;
  parentOrgId: string | null | undefined;
  viewerIsSchoolAdmin: boolean;
  schoolAdminCount: number | null;
  pendingSchoolAdminInvites?: number;
}): boolean {
  if (options.orgType !== "school" || !options.parentOrgId) return false;
  if (options.viewerIsSchoolAdmin) return false;
  if (options.schoolAdminCount == null || options.schoolAdminCount > 0) {
    return false;
  }
  if ((options.pendingSchoolAdminInvites ?? 0) > 0) return false;
  return true;
}
