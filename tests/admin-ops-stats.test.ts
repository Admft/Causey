import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("platform admin ops stats", () => {
  it("slices fetches so unrequested work fail-closes and drafts are opt-in", () => {
    const adminData = read("lib/data/admin.ts");
    expect(adminData).toContain("ADMIN_OPS_SLICES");
    expect(adminData).toContain(
      'export async function getAdminOpsStats(\n  slices: readonly AdminOpsSlice[]\n)'
    );
    expect(adminData).toContain('slices.includes("readyDrafts")');
    expect(adminData).toContain(".limit(1000)");
    expect(adminData).toContain("formatIngestionLastRun");
    expect(adminData).toContain("countPlatformAdmins");
    expect(adminData).toContain("runsUnavailable: true");
    expect(adminData).toContain(
      "runsUnavailable || !lastRun ? null : lastRun.rows_upserted"
    );
    expect(adminData).toContain("return null");
    expect(adminData).toContain("isTournamentPublishReady");
    expect(adminData).toContain('eq("source", "organizer")');
    expect(adminData).not.toContain("publishedByCategory");
    expect(adminData).not.toContain("publishedCategory");
    expect(adminData).not.toContain("lastRun?.rows_upserted ?? 0");
  });

  it("restores the grouped ops ledger in housed two-column cards", () => {
    const overview = read("app/admin/page.tsx");
    const strip = read("components/AdminStatStrip.tsx");

    expect(overview).toContain(
      'getAdminOpsStats([\n      "listings",\n      "readyDrafts",\n      "organizations",\n      "accounts",\n      "ingestion",\n    ])'
    );
    expect(overview).toContain("AdminOpsLedger");
    expect(overview).toContain("Awaiting review");
    expect(overview).toContain("Next in queue");
    expect(overview).toContain("Archived");
    expect(overview).toContain("Total accounts");
    expect(overview).toContain("PortalMission");
    expect(overview).toContain("Moderation first");
    expect(overview).toMatch(/label:\s*"Published"/);
    expect(overview).not.toContain("AdminOpsOverview");
    expect(overview).not.toContain("DATA_SOURCE");
    expect(strip).toContain("AdminOpsLedger");
    expect(strip).toContain("md:grid-cols-2");
    expect(strip).toContain("rounded-2xl");
    expect(strip).toContain("StatCluster");
    expect(strip).toContain('return "Unavailable"');
    expect(strip).not.toContain("AdminOpsOverview");
  });

  it("puts a fail-closed mix or bar chart on every admin section", () => {
    const charts = read("components/AdminCharts.tsx");
    const helpers = read("lib/admin-charts.ts");
    const overview = read("app/admin/page.tsx");
    const moderation = read("app/admin/moderation/page.tsx");
    const tournaments = read("app/admin/tournaments/page.tsx");
    const orgs = read("app/admin/organizations/page.tsx");
    const users = read("app/admin/users/page.tsx");
    const scrapers = read("app/admin/scrapers/page.tsx");

    expect(helpers).toContain("adminChartUnavailable");
    expect(helpers).toContain("scrapeRunBarValue");
    expect(charts).toContain("AdminMixChart");
    expect(charts).toContain("AdminBarChart");
    expect(charts).toContain("missing counts are not");
    expect(charts).not.toContain("recharts");
    expect(overview).toContain("AdminMixChart");
    expect(overview).toContain("AdminBarChart");
    expect(overview).toContain("Organizer pipeline");
    expect(moderation).toContain("Waiting by type");
    expect(moderation).toContain("AdminBarChart");
    expect(tournaments).toContain("AdminTournamentQueues");
    expect(read("components/AdminTournamentQueues.tsx")).toContain("Work queues");
    expect(orgs).toContain("By type");
    expect(users).toContain("remainderCount");
    expect(scrapers).toContain("Rows upserted");
    expect(scrapers).toContain("AdminMixChart");
  });

  it("fetches only the slice each destination needs", () => {
    const moderation = read("app/admin/moderation/page.tsx");
    const tournaments = read("app/admin/tournaments/page.tsx");
    const orgs = read("app/admin/organizations/page.tsx");
    const users = read("app/admin/users/page.tsx");
    const scrapers = read("app/admin/scrapers/page.tsx");

    expect(moderation).toContain('getAdminOpsStats(["listings"])');
    expect(moderation).toContain("Published organizer listings");
    expect(tournaments).toContain(
      'getAdminOpsStats(["listings", "readyDrafts"])'
    );
    expect(tournaments).toContain("AdminTournamentQueues");
    expect(tournaments).toContain("ready: true");
    expect(read("lib/admin-tournament-filters.ts")).toContain(
      'status: "archived"'
    );
    expect(orgs).toContain('getAdminOpsStats(["organizations"])');
    expect(orgs).toContain("initialStatus");
    expect(orgs).toContain("/admin/organizations?status=pending");
    expect(users).not.toContain("getAdminOpsStats");
    expect(users).toContain("countPlatformAdmins");
    expect(users).toContain("error ? null : total");
    expect(users).toContain("Platform admins");
    expect(scrapers).not.toContain("getAdminOpsStats");
    expect(scrapers).toContain("getAdminIngestionSourceHealth");
    expect(scrapers).toContain("runResult");
    expect(scrapers).toContain("Source health");
  });
});
