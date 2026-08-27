import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("platform admin ops stats", () => {
  it("counts listings globally and fails closed instead of faking zero", () => {
    const adminData = read("lib/data/admin.ts");
    expect(adminData).toContain("export async function getAdminOpsStats");
    expect(adminData).toContain('listing("archived")');
    expect(adminData).toContain('listing("rejected")');
    expect(adminData).toContain('eq("source", "organizer")');
    expect(adminData).toContain("readyToPublish");
    expect(adminData).toContain("isTournamentPublishReady");
    expect(adminData).toContain("return null");
    expect(adminData).toContain("search_platform_users");
    expect(adminData).toContain("evaluateSourceOperationalHealth");
  });

  it("shows a grouped ops ledger on overview with archived and ingestion", () => {
    const overview = read("app/admin/page.tsx");
    expect(overview).toContain("getAdminOpsStats");
    expect(overview).toContain("AdminOpsLedger");
    expect(overview).toContain("Archived");
    expect(overview).toContain("Ready to publish");
    expect(overview).toContain("Runnable sources needing attention");
    expect(overview).toContain("Moderation first");
    expect(overview).not.toContain("lg:grid-cols-4");
  });

  it("puts a job-specific strip on every admin surface", () => {
    const moderation = read("app/admin/moderation/page.tsx");
    const tournaments = read("app/admin/tournaments/page.tsx");
    const scrapers = read("app/admin/scrapers/page.tsx");
    const orgs = read("app/admin/organizations/page.tsx");
    const users = read("app/admin/users/page.tsx");

    expect(moderation).toContain("Published organizer listings");
    expect(tournaments).toContain("getAdminOpsStats");
    expect(tournaments).toContain('status: "archived"');
    expect(tournaments).toContain("ready: true");
    expect(scrapers).toContain("getAdminIngestionSourceHealth");
    expect(scrapers).toContain("Source health");
    expect(orgs).toContain("initialStatus");
    expect(orgs).toContain("/admin/organizations?status=pending");
    expect(users).toContain("Platform admins");
  });

  it("does not mock the /admin overview route for these counts", () => {
    const overview = read("app/admin/page.tsx");
    expect(overview).toContain("getAdminOpsStats");
    expect(overview).not.toContain("DATA_SOURCE");
  });
});
