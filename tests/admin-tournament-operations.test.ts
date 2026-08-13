import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_RUNNABLE_SCRAPER_SOURCES,
  adminScraperCategoryGroups,
} from "@/lib/admin-scrapers";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
  getGitHubIngestionConfig: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
}));
vi.mock("@/lib/github-ingestion", () => ({
  getGitHubIngestionConfig: mocks.getGitHubIngestionConfig,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

describe("admin tournament operations authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformAdminUser.mockResolvedValue(null);
  });

  it("rejects tournament deletion for non-admins", async () => {
    const { adminDeleteTournaments } = await import(
      "@/lib/actions/admin-operations"
    );

    await expect(
      adminDeleteTournaments({
        competitionIds: ["00000000-0000-0000-0000-000000000000"],
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });

  it("rejects scraper dispatch for non-admins", async () => {
    const { adminRunScraper } = await import("@/lib/actions/admin-operations");

    await expect(adminRunScraper({ source: "all" })).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });
});

describe("admin scraper dispatch", () => {
  const rpc = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    mocks.getPlatformAdminUser.mockResolvedValue({ id: "admin-1" });
    mocks.getGitHubIngestionConfig.mockReturnValue({
      ok: true,
      config: {
        repository: "causey/app",
        ref: "dev",
        token: "test-token",
        workflowUrl: "https://github.com/causey/app/actions/workflows/ingest.yml",
      },
    });
    rpc.mockResolvedValue({ data: null, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });
    fetchMock.mockResolvedValue({ ok: true });
  });

  it("sends a governed subset through one sequential workflow run", async () => {
    const { adminRunScraper } = await import("@/lib/actions/admin-operations");
    const result = await adminRunScraper({
      sources: ["purple_comet_scrape", "txsef_scrape"],
    });

    expect(result).toEqual({
      ok: true,
      sources: ["purple_comet_scrape", "txsef_scrape"],
      workflowUrl:
        "https://github.com/causey/app/actions/workflows/ingest.yml",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      ref: "dev",
      inputs: {
        source: "purple_comet_scrape",
        sources: "purple_comet_scrape,txsef_scrape",
      },
    });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("rejects HTTP-blocked sources before dispatch", async () => {
    const { adminRunScraper } = await import("@/lib/actions/admin-operations");

    await expect(
      adminRunScraper({ sources: ["doe_science_bowl_scrape"] })
    ).resolves.toEqual({
      ok: false,
      error: "Choose at least one valid tournament scraper.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("admin tournament operations migration", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0039_admin_tournament_operations.sql"
    ),
    "utf8"
  );

  it("keeps permanent deletion behind an admin-checked RPC", () => {
    expect(sql).toContain(
      "create or replace function public.admin_delete_competitions"
    );
    expect(sql).toContain("not public.is_platform_admin()");
    expect(sql).toContain("delete from public.qualification_rules");
    expect(sql).toContain("set canonical_id = null");
    expect(sql).toContain(
      "revoke execute on function public.admin_delete_competitions"
    );
    expect(sql).not.toMatch(
      /create policy[^;]+competitions[^;]+for delete/is
    );
  });

  it("exposes scrape logs read-only to platform admins", () => {
    expect(sql).toContain('create policy "platform_admins_read_scrape_runs"');
    expect(sql).toContain("using (public.is_platform_admin())");
    expect(sql).toContain("grant select on public.scrape_runs to authenticated");
    expect(sql).not.toMatch(
      /grant (insert|update|delete)[^;]*scrape_runs/i
    );
  });
});

describe("manual ingestion workflow", () => {
  const workflow = readFileSync(
    resolve(process.cwd(), ".github/workflows/ingest.yml"),
    "utf8"
  );

  it.each(ADMIN_RUNNABLE_SCRAPER_SOURCES)(
    "supports manually dispatching governed source %s",
    (source) => {
      expect(
        sourceByCompetitionSource(source)?.governance.automationState
      ).toBe("enabled");
      expect(workflow).toContain(`- ${source}`);
      expect(workflow).toContain(`${source}) npm run scrape:`);
    }
  );

  it("groups only runnable sources in public category order", () => {
    const groups = adminScraperCategoryGroups();
    expect(groups.map((group) => group.id)).toEqual([
      "chess",
      "debate",
      "stem",
      "arts",
      "writing",
    ]);
    const groupedSources = groups.flatMap((group) =>
      group.options.map((option) => option.value)
    );
    expect(groupedSources).toEqual(ADMIN_RUNNABLE_SCRAPER_SOURCES);
    expect(groupedSources).not.toContain("doe_science_bowl_scrape");
  });

  it("runs multi-source admin requests sequentially in one workflow", () => {
    expect(workflow).toContain("inputs.sources || inputs.source || 'all'");
    expect(workflow).toContain("for source in");
    expect(workflow).toContain('run_source "$source"');
    expect(workflow).not.toContain("SCRAPE_INCLUDE_BLOCKED");
  });

  it("does not expose blocked sources for manual dispatch", () => {
    for (const source of [
      "tabroom_scrape",
      "vex_events_scrape",
      "doe_science_bowl_scrape",
    ]) {
      expect(workflow).not.toContain(`- ${source}`);
      expect(workflow).not.toContain(`${source}) npm run scrape:`);
    }
  });

  it("supports the all-sources dispatch", () => {
    expect(workflow).toContain("- all");
    expect(workflow).toContain("all) npm run scrape:all");
  });

  it("queues overlapping ingestion requests instead of racing them", () => {
    expect(workflow).toContain("group: causey-tournament-ingestion");
    expect(workflow).toContain("cancel-in-progress: false");
  });
});
