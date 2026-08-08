import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0028_effective_organization_authority.sql"
  ),
  "utf8"
);
const portal = readFileSync(
  resolve(process.cwd(), "lib/data/portal.ts"),
  "utf8"
);

describe("effective organization authority", () => {
  it("backfills and defaults an explicit owner", () => {
    expect(migration).toContain(
      "set owner_profile_id = created_by"
    );
    expect(migration).toContain(
      "create or replace function public.set_organization_initial_owner()"
    );
    expect(migration).toContain(
      "new.owner_profile_id := new.created_by"
    );
  });

  it("uses ownership and active roles instead of creator provenance", () => {
    const staffHelper = migration.match(
      /create or replace function public\.is_org_staff\([\s\S]*?\$\$;/
    )?.[0];
    const adminHelper = migration.match(
      /create or replace function public\.is_org_admin\([\s\S]*?\$\$;/
    )?.[0];
    const districtHelper = migration.match(
      /create or replace function public\.is_district_admin\([\s\S]*?\$\$;/
    )?.[0];

    for (const helper of [staffHelper, adminHelper, districtHelper]) {
      expect(helper).toBeDefined();
      expect(helper).toContain("owner_profile_id = p_profile_id");
      expect(helper).not.toContain("created_by = p_profile_id");
    }
  });

  it("removes creator delete and private-record access after transfer", () => {
    expect(migration).toContain(
      'drop policy if exists "orgs_delete_creator"'
    );
    expect(migration).toContain(
      'create policy "orgs_delete_owner"'
    );
    expect(migration).toContain("owner_profile_id = auth.uid()");
    expect(migration).toContain("c.org_id is null");
    expect(migration).toContain("public.is_org_staff(c.org_id, p_profile_id)");
  });

  it("uses database-backed authority for child schools and tournaments", () => {
    expect(portal).toContain('supabase.rpc("can_administer_org"');
    expect(portal).toContain('supabase.rpc("is_org_staff"');
    expect(portal).toContain('supabase.rpc("can_manage_competition"');
    expect(portal).not.toContain(
      '.from("organizations").select("*").eq("created_by", userId)'
    );
  });

  it("keeps district authority over child schools after ownership handoff", () => {
    const administerHelper = migration.match(
      /create or replace function public\.can_administer_org\([\s\S]*?\$\$;/
    )?.[0];
    expect(administerHelper).toBeDefined();
    expect(administerHelper).toContain("child.parent_org_id is not null");
    expect(administerHelper).toContain(
      "public.is_district_admin(child.parent_org_id, p_profile_id)"
    );
  });
});
