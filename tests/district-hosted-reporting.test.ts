import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district-hosted reporting attribution", () => {
  const migration = source(
    "supabase/migrations/0046_district_hosted_reporting.sql"
  );
  const reportPage = source("app/orgs/[slug]/reports/page.tsx");
  const exportRoute = source(
    "app/orgs/[slug]/reports/export/route.ts"
  );

  it("authorizes and aggregates only the exact district host", () => {
    expect(migration).toContain(
      "public.is_district_admin(p_district_id, auth.uid())"
    );
    expect(migration).toContain(
      "where competition.org_id = p_district_id"
    );
    expect(migration).toContain(
      "count(distinct (entrant.competition_id, entrant.profile_id))"
    );
  });

  it("does not infer a school for district-hosted entrants", () => {
    expect(migration).not.toContain("parent_org_id");
    expect(migration).not.toContain("org_memberships");
    expect(reportPage).toContain(
      "They are not"
    );
    expect(reportPage).toContain(
      "divided among school rows without a recorded school"
    );
  });

  it("labels district, school, and origin attribution separately in CSV", () => {
    expect(exportRoute).toContain('"Attribution"');
    expect(exportRoute).toContain('"Type"');
    expect(exportRoute).toContain('"District-hosted"');
    expect(exportRoute).toContain('"School-hosted"');
    expect(exportRoute).toContain('"District-hosted by school"');
    expect(exportRoute).toContain("typeLabel");
  });
});
