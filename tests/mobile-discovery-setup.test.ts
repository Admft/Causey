import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const districtPitch = read("components/HomeDistrictPitch.tsx");
const searchClient = read("components/SearchClient.tsx");
const searchFilters = read("components/SearchFilters.tsx");

describe("mobile discovery and private district setup", () => {
  it("does not put example schools in the public district pitch", () => {
    expect(districtPitch).toContain("Private setup first");
    expect(districtPitch).toContain("does not publish a speculative school list");
    expect(districtPitch).not.toContain("Washington Elementary");
    expect(districtPitch).not.toContain("Jefferson Middle School");
    expect(districtPitch).not.toContain("Lincoln High School");
  });

  it("puts compact filters before the mobile tournament search controls", () => {
    expect(searchClient.indexOf('idPrefix="mobile-filter"')).toBeLessThan(
      searchClient.indexOf('htmlFor="tournament-search"')
    );
    expect(searchClient).toContain("hidden lg:sticky");
    expect(searchFilters).toContain("grid-cols-2 gap-3");
    expect(searchFilters).toContain('idPrefix = "filter"');
  });
});
