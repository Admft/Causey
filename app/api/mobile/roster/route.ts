import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { getMyOrgs, getOrgRoster } from "@/lib/data/portal";
import { canMarkOrganizationAttending } from "@/lib/org-permissions";

export const dynamic = "force-dynamic";

const OrgIdSchema = z.string().uuid();

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const orgId = new URL(request.url).searchParams.get("orgId");
  const parsed = OrgIdSchema.safeParse(orgId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick an organization." }, { status: 400 });
  }

  // RLS also guards get_org_roster; this keeps the refusal specific.
  const staffed = (await getMyOrgs(auth.user.id, auth.supabase)).find(
    (row) => row.org.id === parsed.data && row.isCoach
  );
  if (!staffed) {
    return NextResponse.json(
      { error: "You do not staff that organization." },
      { status: 403 }
    );
  }
  if (!canMarkOrganizationAttending(staffed.org)) {
    return NextResponse.json(
      {
        error:
          "District offices do not have student rosters. Open a connected school instead.",
      },
      { status: 400 }
    );
  }

  const roster = await getOrgRoster(parsed.data, auth.supabase);

  return NextResponse.json({
    org: {
      id: staffed.org.id,
      name: staffed.org.name,
      slug: staffed.org.slug,
      type: staffed.org.type,
    },
    students: roster
      .filter((row) => row.member_role === "student")
      .map((row) => ({
        profile_id: row.profile_id,
        display_name: row.display_name,
        grade: row.grade,
        member_status: row.member_status,
      })),
  });
}
