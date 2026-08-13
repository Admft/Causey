import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("platform admin district readiness summary", () => {
  const page = source("app/admin/organizations/page.tsx");
  const explorer = source("components/AdminOrganizationsExplorer.tsx");

  it("loads every district readiness result independently", () => {
    expect(page).toContain(
      '.filter((organization) => organization.type === "district")'
    );
    expect(page).toContain("await getDistrictPilotReadiness(district.id)");
    expect(page).toContain("districtReadinessById={districtReadinessById}");
  });

  it("keeps every district summary visible without opening its panel", () => {
    expect(explorer).toContain(
      "districtReadinessById[org.id]"
    );
    expect(explorer).toContain(
      "getDistrictReadinessSummary(readinessResult.data)"
    );
    expect(explorer).toContain(
      "ready · ${readiness.nextAction.title}"
    );
  });

  it("does not paint a failed readiness read as zero or ready", () => {
    expect(explorer).toContain("Pilot readiness unavailable");
    expect(explorer).toContain(
      "Do not treat this district as empty or ready."
    );
    expect(explorer).toContain(
      "Pilot readiness unavailable · retry before operating"
    );
  });
});
