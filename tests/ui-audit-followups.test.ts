import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("UI audit follow-ups", () => {
  it("keeps load-more failures separate from loaded search results", () => {
    const search = source("components/SearchClient.tsx");
    expect(search).toContain("setLoadMoreError(");
    expect(search).toContain("Your current results are still available.");
    expect(search).toContain("syncingFromUrl.current");
    expect(search).toContain("if (nextUrl !== currentUrl)");
  });

  it("checks destructive action results before removing UI context", () => {
    const entrants = source("components/EntrantManager.tsx");
    const parentUnlink = source("components/UnlinkChildButton.tsx");
    const recommendation = source("components/DismissRecommendationButton.tsx");

    expect(entrants).toContain("const result = await removeEntrant");
    expect(parentUnlink).toContain("const result = await revokeLink");
    expect(recommendation).toContain("const result = await dismissRecommendation");
    expect(entrants).toContain('role="alert"');
    expect(parentUnlink).toContain('role="alert"');
    expect(recommendation).toContain('role="alert"');
  });

  it("uses native and named controls for audited accessibility paths", () => {
    const pathways = source("components/PathwayExplorer.tsx");
    const reports = source("app/orgs/[slug]/reports/page.tsx");
    const people = source("components/OrganizationPeopleManager.tsx");

    expect(pathways).toContain('type="radio"');
    expect(pathways).not.toContain('role="radio"');
    expect(reports).toContain("<caption");
    expect(reports).toContain('scope="col"');
    expect(reports).toContain('scope="row"');
    expect(people).toContain("CSV roster file");
  });
});
