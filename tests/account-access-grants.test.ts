import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("account-access grant fit", () => {
  it("blocks membership roles that do not fit the organization type", () => {
    const migration = read(
      "supabase/migrations/0105_membership_role_fits_organization.sql"
    );
    expect(migration).toContain("invitation_role_fits_organization");
    expect(migration).toContain("membership_role_does_not_fit_organization");
    expect(migration).toContain("create or replace function public.guard_membership_scope()");
    expect(migration).toContain(
      "create or replace function public.admin_upsert_org_membership("
    );
    expect(read("lib/actions/admin.ts")).toContain(
      "membership_role_does_not_fit_organization"
    );
    expect(read("components/AdminOrgMembershipForm.tsx")).toContain(
      "role must fit that"
    );
  });

  it("keeps People CSV and single invites on the same type-fit helper", () => {
    const invites = read("lib/actions/district.ts");
    expect(invites).toContain("invitationRoleFitsOrganization(orgType, parsed.data.role)");
    expect(invites).toContain("invitationRoleFitsOrganization(orgType, roleParsed.data)");
    const people = read("components/OrganizationPeopleManager.tsx");
    expect(people).toContain("assistant_coach, or school_admin");
    expect(people).toContain("district_admin, coach");
  });

  it("sends district competition-only staff to Competitions, not Schools", () => {
    const account = read("app/account/page.tsx");
    expect(account).toContain('row.org.type === "district" && admin');
    expect(account).toContain("orgCompetitionsHref(row.org.slug)");
    expect(account).not.toContain("row.isCoach && row.org.type === \"district\"");
  });
});
