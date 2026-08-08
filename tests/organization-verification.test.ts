import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0027_organization_verification_workflow.sql"
  ),
  "utf8"
);
const districtActions = readFileSync(
  resolve(process.cwd(), "lib/actions/district.ts"),
  "utf8"
);

describe("organization verification governance", () => {
  it("reserves verification changes for platform admins", () => {
    expect(migration).toContain(
      "create or replace function public.guard_organization_verification()"
    );
    expect(migration).toContain(
      "organization_verification_requires_platform_admin"
    );
    expect(migration).toContain("not public.is_platform_admin()");

    const guard = migration.match(
      /create or replace function public\.guard_organization_verification\(\)([\s\S]*?)\$\$;/
    )?.[1];
    expect(guard).toBeDefined();
    expect(guard).not.toContain("security definer");
  });

  it("keeps correction notes private to admins", () => {
    expect(migration).toContain(
      "create table public.organization_verification_reviews"
    );
    expect(migration).toContain(
      "public.can_administer_org(org_id, auth.uid())"
    );
    expect(migration).toContain(
      "revoke all on public.organization_verification_reviews"
    );
    expect(migration).not.toMatch(
      /grant select on public\.organization_verification_reviews to (public|anon)/
    );
  });

  it("requires a correction reason and records the reviewer", () => {
    expect(migration).toContain("rejection_note_required");
    expect(migration).toContain("reviewed_by");
    expect(migration).toContain("reviewed_at");
    expect(migration).toContain(
      "create or replace function public.review_organization_verification"
    );
  });

  it("leaves district-created schools pending for platform review", () => {
    expect(districtActions).toContain('verification_status: "pending"');
    expect(districtActions).not.toContain('verification_status: "verified"');
  });
});
