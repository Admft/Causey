import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
}));

describe("admin tournament operations authorization", () => {
  beforeEach(() => {
    mocks.getPlatformAdminUser.mockReset();
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

  it.each([
    "tla_scrape",
    "cca_scrape",
    "onlinereg_scrape",
    "chess_results_scrape",
    "fide_calendar_scrape",
    "tca_scrape",
  ])("supports manually dispatching %s", (source) => {
    expect(workflow).toContain(`- ${source}`);
    expect(workflow).toContain(`${source}) npm run scrape:`);
  });

  it("queues overlapping ingestion requests instead of racing them", () => {
    expect(workflow).toContain("group: causey-tournament-ingestion");
    expect(workflow).toContain("cancel-in-progress: false");
  });
});
