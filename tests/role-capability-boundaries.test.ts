import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0035_role_capability_boundaries.sql"
  ),
  "utf8"
);
const portal = readFileSync(
  resolve(process.cwd(), "lib/data/portal.ts"),
  "utf8"
);
const rosterPage = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/roster/page.tsx"),
  "utf8"
);

describe("organization role capability boundaries", () => {
  it("keeps assistants out of the operator helper", () => {
    const helper = migration.match(
      /create or replace function public\.is_org_coach\([\s\S]*?\$\$;/
    )?.[0];
    expect(helper).toBeTruthy();
    expect(helper).not.toContain("'assistant_coach'");
    expect(helper).toContain("'coach'");
    expect(helper).toContain("'school_admin'");
  });

  it("uses the narrow helper for tournament writes", () => {
    expect(migration).toContain(
      "public.is_org_coach(org_id, auth.uid())"
    );
    expect(migration).toContain(
      "public.is_org_coach(c.org_id, p_profile_id)"
    );
    expect(portal).toContain('supabase.rpc("is_org_coach"');
  });

  it("renders assistant roster access as read-only", () => {
    expect(rosterPage).toContain("Assistant coaches can review");
    expect(rosterPage).toContain("canOperate");
  });
});
