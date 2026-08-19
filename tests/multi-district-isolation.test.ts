import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const authoritySql = source(
  "supabase/migrations/0028_effective_organization_authority.sql"
);
const rollupSql = source(
  "supabase/migrations/0018_district_pilot_foundation.sql"
);
const bulkVerifySql = source(
  "supabase/migrations/0034_bulk_district_school_verification.sql"
);
const membershipSql = source(
  "supabase/migrations/0044_database_security_remediation.sql"
);
const platformAdminSql = source(
  "supabase/migrations/0015_platform_admins.sql"
);
const schoolCreationSql = source(
  "supabase/migrations/0045_atomic_district_school_creation.sql"
);
const districtHostedSql = source(
  "supabase/migrations/0046_district_hosted_reporting.sql"
);
const districtActions = source("lib/actions/district.ts");
const districtData = source("lib/data/district.ts");
const exportRoute = source(
  "app/orgs/[slug]/reports/export/route.ts"
);
const adminExplorer = source("components/AdminOrganizationsExplorer.tsx");

describe("two-district tenant isolation", () => {
  it("derives child-school authority from that school's exact parent district", () => {
    expect(authoritySql).toContain("where child.id = p_org_id");
    expect(authoritySql).toContain(
      "public.is_district_admin(child.parent_org_id, p_profile_id)"
    );
    expect(authoritySql).toContain(
      "public.is_district_admin(parent_org_id, auth.uid())"
    );

    expect(membershipSql).toContain(
      "public.can_administer_org(org_id, auth.uid())"
    );
    expect(membershipSql).toContain(
      "public.is_org_staff(org_id, auth.uid())"
    );
  });

  it("scopes readiness, report rollups, activity, and CSV export to one district id", () => {
    expect(districtData).toContain('.eq("parent_org_id", districtId)');
    expect(districtData).toContain(
      'p_district_id: districtId'
    );
    expect(districtData).toContain(
      'rpc("get_district_admin_activity"'
    );
    expect(rollupSql).toContain(
      "public.is_district_admin(p_district_id, auth.uid())"
    );
    expect(rollupSql).toContain(
      "where school.parent_org_id = p_district_id"
    );
    expect(districtHostedSql).toContain(
      "where competition.org_id = p_district_id"
    );
    expect(exportRoute).toContain(
      "view.org.type !== \"district\" || !view.isDistrictAdmin"
    );
    expect(exportRoute).toContain(
      "getDistrictParticipationReport(view.org.id)"
    );
    expect(exportRoute).toContain('"Cache-Control": "private, no-store"');
  });

  it("rejects a mixed-district bulk verification set atomically", () => {
    expect(bulkVerifySql).toContain(
      "school.parent_org_id = p_district_id"
    );
    expect(bulkVerifySql).toContain(
      "school.id = any(p_school_ids)"
    );
    expect(bulkVerifySql).toContain(
      "if matched_count <> selected_count then"
    );
    expect(bulkVerifySql).toContain(
      "schools_must_be_pending_children_of_one_district"
    );
  });

  it("groups the platform queue by exact parent id", () => {
    expect(platformAdminSql).toContain(
      'create policy "platform_admins_select_all_orgs"'
    );
    expect(platformAdminSql).toContain(
      "using (public.is_platform_admin())"
    );
    expect(adminExplorer).toContain(
      "const list = map.get(org.parent_org_id) ?? []"
    );
    expect(adminExplorer).toContain(
      "map.set(org.parent_org_id, list)"
    );
    expect(adminExplorer).toContain(
      "const schools = schoolsByDistrict.get(org.id) ?? []"
    );
  });
});

describe("atomic district school provisioning", () => {
  it("authorizes the exact district and writes only that parent id", () => {
    expect(schoolCreationSql).toContain(
      "public.is_district_admin(p_district_id, actor)"
    );
    expect(schoolCreationSql).toContain(
      "'school',\n    normalized_state,\n    p_district_id"
    );
    expect(schoolCreationSql).toContain(
      "created_school.id,\n    actor,\n    'school_admin',\n    'active'"
    );
    expect(schoolCreationSql).toContain(
      "grant execute on function public.create_district_school"
    );
  });

  it("uses the atomic RPC instead of separate browser-policy writes", () => {
    const createAction = districtActions.slice(
      districtActions.indexOf("export async function createDistrictSchool"),
      districtActions.indexOf("export async function updateOrganizationSettings")
    );
    expect(createAction).toContain(
      'supabase.rpc("create_district_school"'
    );
    expect(createAction).not.toContain('.from("organizations")');
    expect(createAction).not.toContain('.from("org_memberships")');
  });
});
