import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("0025 district lifecycle guardrails", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0025_district_lifecycle_guardrails.sql"
    ),
    "utf8"
  );

  it("reserves district creation for platform administrators", () => {
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).toMatch(
      /public\.is_unlocked_coach\(auth\.uid\(\)\)[\s\S]*type <> 'district'/
    );
  });

  it("locks organization type and hierarchy after creation", () => {
    expect(sql).toContain("guard_organization_governance");
    expect(sql).toContain("old.type is distinct from new.type");
    expect(sql).toContain(
      "old.parent_org_id is distinct from new.parent_org_id"
    );
  });

  it("prevents district-level student and school-admin membership", () => {
    expect(sql).toContain("guard_membership_scope");
    expect(sql).toContain("new.role in ('student', 'school_admin')");
    expect(sql).toContain("guard_org_invitation_scope");
  });

  it("keeps anonymous join previews but excludes districts from join codes", () => {
    expect(sql).toContain("to anon, authenticated");
    expect(sql.match(/o\.type <> 'district'/g)).toHaveLength(2);
  });
});
