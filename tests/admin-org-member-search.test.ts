import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migration = read(
  "supabase/migrations/0094_admin_org_member_search.sql"
);
const adminData = read("lib/data/admin.ts");
const adminActions = read("lib/actions/admin.ts");
const explorer = read("components/AdminOrganizationsExplorer.tsx");
const membersPanel = read("components/AdminOrgMembersPanel.tsx");

describe("Admin org creator + member search", () => {
  it("adds a platform-admin scoped member search RPC with pagination", () => {
    expect(migration).toContain("search_org_members");
    expect(migration).toContain("get_admin_profile_contacts");
    expect(migration).toContain("platform_admin_required");
    expect(migration).toContain("org_memberships_org_active_idx");
    expect(migration).toContain("p_org_id");
    expect(migration).toContain("limit safe_limit");
    expect(migration).toContain("offset safe_offset");
    expect(migration).toContain("status is distinct from 'removed'");
  });

  it("loads creator and owner contacts on the org directory", () => {
    expect(adminData).toContain("created_by, owner_profile_id");
    expect(adminData).toContain("get_admin_profile_contacts");
    expect(adminData).toContain("createdBy:");
    expect(adminData).toContain("getAdminOrgMembers");
    expect(explorer).toContain("Created by");
    expect(explorer).toContain("contactLabel(org.createdBy)");
  });

  it("searches members from the expanded org panel without dumping the roster", () => {
    expect(adminActions).toContain("adminSearchOrgMembers");
    expect(membersPanel).toContain("adminSearchOrgMembers");
    expect(membersPanel).toContain("PAGE_SIZE = 25");
    expect(membersPanel).toContain("Search by name or email");
    expect(explorer).toContain("AdminOrgMembersPanel");
  });
});
