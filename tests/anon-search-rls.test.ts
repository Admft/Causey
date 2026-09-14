import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  collectAnonSearchRlsViolations,
  effectiveCompetitionSelectPolicies,
  loadMigrationSql,
  selectPolicyRoles,
} from "../scripts/anon-search-rls.mjs";

const migrationsDirectory = resolve(process.cwd(), "supabase/migrations");
const migrations = loadMigrationSql(migrationsDirectory);

describe("unsigned competition SELECT policies", () => {
  it("treats a missing TO clause as PUBLIC", () => {
    expect(selectPolicyRoles(" using (true)")).toEqual(["public"]);
    expect(selectPolicyRoles(" to authenticated using (true)")).toEqual([
      "authenticated",
    ]);
  });

  it("rejects a PUBLIC unpublished-manager policy that names is_org_coach", () => {
    const violations = collectAnonSearchRlsViolations([
      {
        file: "0099_fake.sql",
        sql: `
          create policy "competitions_select_unpublished_manager"
            on public.competitions for select
            using (public.is_org_coach(org_id, auth.uid()));
          create policy "sections_select_unpublished_manager"
            on public.sections for select
            to authenticated
            using (true);
        `,
      },
    ]);
    expect(
      violations.some(
        (line) =>
          line.includes("competitions_select_unpublished_manager") &&
          (line.includes("staff helper") || line.includes("still applies to"))
      )
    ).toBe(true);
  });

  it("ignores a PUBLIC staff-helper policy that a later migration dropped", () => {
    expect(
      collectAnonSearchRlsViolations([
        {
          file: "0011_org_access.sql",
          sql: `
            create policy "published competitions readable by visibility"
              on public.competitions for select
              using (public.is_org_coach(org_id, auth.uid()));
            create policy "competitions_select_unpublished_manager"
              on public.competitions for select
              to authenticated
              using (true);
            create policy "sections_select_unpublished_manager"
              on public.sections for select
              to authenticated
              using (true);
          `,
        },
        {
          file: "0037_anon_public_competition_search.sql",
          sql: `
            drop policy if exists "published competitions readable by visibility"
              on public.competitions;
            create policy "published public competitions readable"
              on public.competitions for select
              using (audience = 'public' and status = 'published');
          `,
        },
      ])
    ).toEqual([]);
  });

  it("keeps staff helpers off PUBLIC/anon SELECT on competitions and sections", () => {
    expect(collectAnonSearchRlsViolations(migrations)).toEqual([]);
  });

  it("scopes unpublished-manager policies to authenticated in the latest definition", () => {
    const unpublished = effectiveCompetitionSelectPolicies(migrations).filter(
      (policy) => policy.name.endsWith("_select_unpublished_manager")
    );
    expect(unpublished).toHaveLength(2);
    expect(
      unpublished.every(
        (policy) =>
          policy.roles.length === 1 && policy.roles[0] === "authenticated"
      )
    ).toBe(true);
  });
});
