import "server-only";

import { getSessionUser } from "@/lib/auth/session";
import { getMyOrgs, isSupabaseConfigured } from "@/lib/data/portal";
import { orgGoingFilterLabel, orgMembershipKindsFromTypes } from "@/lib/portal-copy";

/** Signed-in search filter label from the viewer's organization memberships. */
export async function searchOrgGoingFilterLabel(): Promise<string> {
  if (!isSupabaseConfigured()) return "My club is going";
  const user = await getSessionUser();
  if (!user) return "My club is going";
  const orgs = await getMyOrgs(user.id);
  return orgGoingFilterLabel(
    orgMembershipKindsFromTypes(orgs.map((row) => row.org.type))
  );
}
