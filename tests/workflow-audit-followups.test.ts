import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("workflow audit follow-ups", () => {
  it("stamps parent organizer registration opens onto the linked child", () => {
    const route = readFileSync(
      resolve(process.cwd(), "app/event/[slug]/register/route.ts"),
      "utf8"
    );
    const family = readFileSync(
      resolve(process.cwd(), "components/FamilyRegistrationActions.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      resolve(process.cwd(), "components/ExternalRegistrationPanel.tsx"),
      "utf8"
    );
    expect(route).toContain('searchParams.get("for")');
    expect(route).toContain("household_links");
    expect(family).toContain("register?for=");
    expect(panel).toContain("profileId");
    expect(panel).toContain("Causey RSVP is not");
  });

  it("uses Plan and Family naming consistently", () => {
    const nav = readFileSync(
      resolve(process.cwd(), "components/AuthNav.tsx"),
      "utf8"
    );
    const me = readFileSync(resolve(process.cwd(), "app/me/page.tsx"), "utf8");
    const family = readFileSync(
      resolve(process.cwd(), "app/family/page.tsx"),
      "utf8"
    );
    expect(nav).toContain('label: "Plan"');
    expect(nav).not.toContain('label: "My tournaments"');
    expect(me).toContain("Your plan");
    expect(family).toContain("Who needs you");
    expect(family).not.toContain("Parent desk");
  });

  it("lets platform admins grant organization membership from users", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0042_admin_org_membership_support.sql"
      ),
      "utf8"
    );
    const actions = readFileSync(
      resolve(process.cwd(), "lib/actions/admin.ts"),
      "utf8"
    );
    const directory = readFileSync(
      resolve(process.cwd(), "components/AdminUserDirectory.tsx"),
      "utf8"
    );
    expect(migration).toContain("admin_upsert_org_membership");
    expect(migration).toContain("upsert_org_membership");
    expect(actions).toContain("adminUpsertOrgMembership");
    expect(directory).toContain("AdminOrgMembershipForm");
  });

  it("labels pathways as illustrative scaffolding", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/pathways/page.tsx"),
      "utf8"
    );
    const explorer = readFileSync(
      resolve(process.cwd(), "components/PathwayExplorer.tsx"),
      "utf8"
    );
    expect(page).toContain("Illustrative lookup");
    expect(page).toContain("seeded scaffolding");
    expect(explorer).toContain("illustrative lookup");
  });
});
