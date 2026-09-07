import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("source scraper eligibility", () => {
  it("keeps the registry verdict next to the outreach checklist, not as an ingest backlog", () => {
    const eligibility = read("docs/source-scraper-eligibility.md");
    const outreach = read("docs/source-permission-outreach.md");
    const ingestion = read("ingestion/README.md");

    expect(outreach).toContain("source-scraper-eligibility.md");
    expect(ingestion).toContain("docs/source-scraper-eligibility.md");
    expect(eligibility).toContain("permissionReviewedOn");
    expect(eligibility).toContain("lib/ingestion-sources.ts");

    // A third-party “free API” list is not permission to fetch.
    for (const blocked of [
      "Tabroom",
      "Debate Land",
      "SpeechWire",
      "Devpost",
      "RobotEvents",
      "FRC / FTC Events APIs",
      "MLH",
      "CTFtime",
      "Codeforces",
      "The Blue Alliance",
    ]) {
      expect(eligibility).toContain(blocked);
    }
    expect(outreach).toContain("Do not take a token and ship");
    expect(eligibility).toContain("Do not spawn 50 state-site scrapers");
    expect(outreach).toContain("hackathons.hackclub.com/data");
    expect(eligibility).toContain("hackathons.hackclub.com");
    expect(eligibility).not.toContain("Coming soon");
  });
});
