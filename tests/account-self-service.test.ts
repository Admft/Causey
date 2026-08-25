import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("account export and self-service delete", () => {
  it("lets signed-in users download JSON and delete after typing their email", () => {
    expect(read("app/api/account/export/route.ts")).toContain(
      "causey-account-export.json"
    );
    expect(read("app/api/account/export/route.ts")).toContain("linked_students");
    expect(read("lib/actions/account-data.ts")).toContain("delete_own_account");
    expect(read("lib/actions/account-data.ts")).toContain("owns_organization");
    expect(read("components/AccountDataControls.tsx")).toContain(
      "Type"
    );
    expect(read("app/account/page.tsx")).toContain('id: "data"');
    expect(read("app/privacy/page.tsx")).toContain("/account#data");
  });

  it("blocks organization owners and founder super-admins in SQL", () => {
    const sql = read("supabase/migrations/0063_delete_own_account.sql");
    expect(sql).toContain("owns_organization");
    expect(sql).toContain("cannot_delete_super_admin");
    expect(sql).toContain("delete from auth.users");
    expect(sql).toContain("grant execute on function public.delete_own_account()");
  });
});
