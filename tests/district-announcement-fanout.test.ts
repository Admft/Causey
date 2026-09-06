import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district announcement fan-out to connected schools", () => {
  it("lets district operators choose connected-school delivery from the overview", () => {
    const page = source("app/orgs/[slug]/page.tsx");
    const form = source("components/AnnouncementForm.tsx");
    const actions = source("lib/actions/district.ts");

    expect(page).toContain("getChildSchoolsForDistrict");
    expect(page).toContain("District announcement");
    expect(page).toContain("connectedSchools={connectedSchools.map");
    expect(form).toContain("Every connected school");
    expect(form).toContain("Choose schools");
    expect(form).toContain("District staff only");
    expect(form).toContain("School staff");
    expect(form).toContain("Students and linked parents");
    expect(form).toContain(
      'audience: isDistrict && fanOut ? "connected_schools" : "org"'
    );
    expect(form).toContain("schoolIds: schoolIdsForSubmit");
    expect(form).toContain('useState<AudienceMode>("org")');
    expect(form).toContain("Publish to connected schools");
    expect(actions).toContain('audience: z.enum(["org", "connected_schools"])');
    expect(actions).toContain("schoolIds");
    expect(actions).toContain("notifyStaff");
    expect(actions).toContain("notifyStudents");
    expect(actions).toContain('host.type !== "district"');
    expect(actions).toContain(
      "Add a school, then publish to connected schools."
    );
    expect(actions).toContain('.eq("parent_org_id", parsed.data.orgId)');
    expect(actions).toContain("targets.push(...childSchools)");
    expect(actions).toContain("Choose at least one school.");
  });

  it("keeps school and club announcement copy coach-scoped", () => {
    const page = source("app/orgs/[slug]/page.tsx");
    expect(page).toContain("Coach announcement");
    expect(page).toContain(
      "Share one clear operational update with members and linked parents."
    );
  });

  it("still relies on district operator RLS for child-school inserts", () => {
    const migration = source(
      "supabase/migrations/0043_announcement_district_operator_access.sql"
    );
    expect(migration).toContain(
      "can_operate_org_competitions(org_id, auth.uid())"
    );
    expect(migration).toContain('create policy "announcements_insert_staff"');
  });
});
