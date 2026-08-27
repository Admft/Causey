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
    expect(districtPitch).toContain("Ready for an assisted pilot");
    expect(districtPitch).toContain("participating schools");
    expect(districtPitch).not.toContain("Washington Elementary");
    expect(districtPitch).not.toContain("Jefferson Middle School");
    expect(districtPitch).not.toContain("Lincoln High School");
  });

  it("separates current district readiness from future plans", () => {
    expect(districtPitch).toContain("The district foundation is in place");
    expect(districtPitch).toContain("Planned next");
    expect(districtPitch).toContain("Guided district setup");
    expect(districtPitch).toContain("More competition types");
    expect(districtPitch).toContain("Illustrative season");
    expect(districtPitch).toContain("Illustrative command center");
    expect(districtPitch).not.toContain("what is ready now");
    expect(districtPitch).not.toContain("what we plan to");
    expect(districtPitch).not.toContain("aggregate reporting");
    expect(districtPitch).not.toContain("staff handoff");
    expect(districtPitch).not.toContain("Provision and verify");
    expect((districtPitch.match(/padStart/g) ?? []).length).toBe(1);
  });

  it("puts zip and name search before mobile filters", () => {
    expect(searchClient.indexOf('htmlFor="tournament-search"')).toBeLessThan(
      searchClient.indexOf('idPrefix="mobile-filter"')
    );
    expect(searchClient).toContain("hidden lg:sticky");
    expect(searchClient).toContain("mt-3 text-md text-muted");
    expect(searchClient).not.toContain("hidden max-w-lg text-md text-muted md:block");
    expect(searchClient).not.toContain("hidden md:block");
    expect(searchFilters).toContain("grid-cols-2 gap-3");
    expect(searchFilters).toContain('idPrefix = "filter"');
  });

  it("keeps directory type switching to one scrolling row on phones", () => {
    const subnav = read("components/ChessSubnav.tsx");
    expect(subnav).toContain("hidden shrink-0 text-xs font-semibold text-muted sm:block");
    expect(subnav).toContain("overflow-x-auto");
    expect(subnav).toContain("{cat.shortLabel}");
    expect(subnav).not.toContain("border-t border-line pt-2");
  });
});
