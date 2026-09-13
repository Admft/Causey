import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("district first-session next-step honesty", () => {
  it("wires stage-aware secondary CTAs on the district overview", () => {
    const overview = source("app/orgs/[slug]/page.tsx");
    expect(overview).toContain("getDistrictReadinessSecondary");
    expect(overview).toContain("districtSecondary");
    expect(overview).not.toMatch(
      /secondary=\{\{\s*href: `\/orgs\/\$\{org\.slug\}\/reports`/
    );
  });

  it("sends district Account rows to Schools instead of a dead Roster link", () => {
    const account = source("app/account/page.tsx");
    expect(account).toContain('row.org.type === "district"');
    expect(account).toContain("row.org.slug}/schools");
    expect(account).toContain("studentOrgChromeFromTypes");
    expect(account).not.toContain("Not on a club yet");
    expect(account).not.toContain("share clubs and RSVP help");
    expect(account).not.toContain("help with clubs and RSVPs");
  });

  it("keeps Family leave/event chrome school-or-club honest", () => {
    expect(source("app/family/page.tsx")).toContain(
      "school or club first"
    );
    expect(source("components/LeaveOrgButton.tsx")).toContain(
      "Join another school or club"
    );
    expect(source("app/event/[slug]/page.tsx")).toContain(
      "Entry is through your invite, not open registration."
    );
    expect(source("app/event/[slug]/page.tsx")).not.toContain(
      "your club invite"
    );
  });
});
