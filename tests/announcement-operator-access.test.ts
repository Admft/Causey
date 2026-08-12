import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("organization announcement operator access", () => {
  it("lets district operators publish announcements for child schools", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0043_announcement_district_operator_access.sql"
      ),
      "utf8"
    );
    const actions = readFileSync(
      resolve(process.cwd(), "lib/actions/district.ts"),
      "utf8"
    );
    expect(migration).toContain("can_operate_org_competitions(org_id, auth.uid())");
    expect(migration).toContain('create policy "announcements_insert_staff"');
    expect(actions).toContain("can_operate_org_competitions");
    expect(actions).toContain(
      "Only a coach or organization administrator can publish announcements."
    );
  });
});
