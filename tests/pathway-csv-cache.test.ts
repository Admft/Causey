import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("pathway picker, anonymous search cache, and CSV batching", () => {
  it("loads only competitions that start a qualification hop", () => {
    expect(read("app/api/pathways/route.ts")).toContain(
      "listPathwayCompetitionRefs"
    );
    expect(read("lib/data/supabase.ts")).toContain("listPathwayCompetitionRefs");
    expect(read("lib/data/supabase.ts")).toContain("QUALIFICATION_RULES_TTL_MS");
    expect(read("lib/data/mock.ts")).toContain("listPathwayCompetitionRefs");
  });

  it("caches anonymous competition search and batches CSV invites", () => {
    expect(read("app/api/competitions/route.ts")).toContain(
      "s-maxage=60, stale-while-revalidate=300"
    );
    expect(read("app/api/competitions/route.ts")).toContain("private, no-store");
    expect(read("lib/actions/district.ts")).toContain("INVITE_CONCURRENCY");
    expect(read("lib/actions/district.ts")).toContain("Promise.all");
  });
});
