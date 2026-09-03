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
      adminRunScraper({ sources: ["vex_events_scrape"] })
    ).resolves.toEqual({
      ok: false,
      error: "Choose at least one valid tournament scraper.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains that a 404 can mean a disabled workflow", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const { adminRunScraper } = await import("@/lib/actions/admin-operations");

    await expect(
      adminRunScraper({ sources: ["tla_scrape"] })
    ).resolves.toEqual({
      ok: false,
      error:
        "GitHub could not dispatch this request. The workflow may be disabled, missing on the configured ref, or inaccessible to the token.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a warning when GitHub accepts a run but dispatch auditing fails", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "invalid_scraper_source" },
    });
    const { adminRunScraper } = await import("@/lib/actions/admin-operations");

    await expect(
      adminRunScraper({ sources: ["purple_comet_scrape"] })
    ).resolves.toEqual({
      ok: true,
      sources: ["purple_comet_scrape"],
      workflowUrl:
        "https://github.com/causey/app/actions/workflows/ingest.yml",
      auditWarning:
        "GitHub accepted the scraper request, but Causey could not save its admin audit record.",
    });
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
  const dispatchSourceSql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0072_doe_science_bowl_dispatch.sql"
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

  it("audits every governed admin scraper source", () => {
    for (const source of [...ADMIN_RUNNABLE_SCRAPER_SOURCES, "all"]) {
      expect(dispatchSourceSql).toContain(`'${source}'`);
    }
    for (const source of [
      "tabroom_scrape",
      "vex_events_scrape",
    ]) {
      expect(dispatchSourceSql).not.toContain(`'${source}'`);
    }
    expect(dispatchSourceSql).toContain("security definer");
    expect(dispatchSourceSql).toContain("not public.is_platform_admin()");
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
    expect(groupedSources).toContain("doe_science_bowl_scrape");
    expect(groupedSources).not.toContain("vex_events_scrape");
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

  it("schedules twice-weekly ingestion from the released main workflow using dev code", () => {
    expect(workflow).toContain('cron: "0 11 * * 1,4"');
    expect(workflow).toContain(
      "github.event_name == 'schedule' && 'dev' || github.ref"
    );
    expect(workflow).toContain(
      "github.event_name == 'workflow_dispatch' && github.ref_name != 'dev'"
    );
  });
});
