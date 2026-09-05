import { NextResponse } from "next/server";
import type { OrganizationType, OrgMemberRole } from "@/lib/auth/orgs";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { getMyOrgs, type MyOrgRow } from "@/lib/data/portal";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";

export const dynamic = "force-dynamic";

export type MobileOrgListItem = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  role: OrgMemberRole | null;
  isCoach: boolean;
  has_roster: boolean;
};

/** Memberships for this account — not a public club directory. */
export function serializeMobileOrgs(rows: MyOrgRow[]): MobileOrgListItem[] {
  return rows.map((row) => ({
    id: row.org.id,
    name: row.org.name,
    slug: row.org.slug,
    type: row.org.type,
    role: row.memberRole,
    isCoach: row.isCoach,
    has_roster: canMarkOrganizationAttending(row.org),
  }));
}

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const rows = await getMyOrgs(auth.user.id, auth.supabase);
  return NextResponse.json({ orgs: serializeMobileOrgs(rows) });
}
