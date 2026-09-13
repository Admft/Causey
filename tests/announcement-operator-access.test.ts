import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("organization announcement operator access", () => {
  it("lets district operators publish announcements for child schools", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0099_district_claim_owner_handoff.sql"
      ),
      "utf8"
    );
    const actions = readFileSync(
      resolve(process.cwd(), "lib/actions/district.ts"),
      "utf8"
    );
    expect(migration).toContain("can_publish_org_announcement");
    expect(migration).toContain('create policy "announcements_insert_staff"');
    expect(actions).toContain("can_publish_org_announcement");
    expect(actions).toContain('audience === "connected_schools"');
    expect(actions).toContain("assertCanPublish");
  });
});
