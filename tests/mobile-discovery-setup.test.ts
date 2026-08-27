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
    expect(districtPitch).toContain("School districts");
    expect(districtPitch).toContain("participating schools");
    expect(districtPitch).not.toContain("Washington Elementary");
    expect(districtPitch).not.toContain("Jefferson Middle School");
    expect(districtPitch).not.toContain("Lincoln High School");
  });

  it("sets club and district as different objects, not twin brochures", () => {
    const districtsPage = read("app/districts/page.tsx");
    expect(districtPitch).toContain("Chess for a whole district, set up with you.");
    expect(districtPitch).toContain("assisted chess pilot");
    expect(districtPitch).toContain("Club season");
    expect(districtPitch).toContain("font-display text-2xl tabular-nums");
    expect(districtPitch).toContain("bg-brand-blue-soft");
    expect(districtPitch).toContain("lg:col-span-7");
    expect(districtPitch).toContain("lg:col-span-5");
    expect(districtPitch).toContain("lg:mt-20");
    expect(districtPitch).toContain("See the club workspace");
    expect(districtPitch).toContain("Create a club account");
    expect(districtPitch).toContain("Review the district pilot");
    expect(districtPitch).toContain("District office");
    expect(districtPitch).toContain("School tournament");
    expect(districtPitch).toContain("District-wide");
    expect(districtPitch).not.toContain("Planned next");
    expect(districtPitch).not.toContain("Guided district setup");
    expect(districtPitch).not.toContain("BuyerColumn");
    expect(districtPitch).not.toContain("lg:grid-rows-subgrid");
    expect(districtPitch).not.toContain("Ready for an assisted pilot");
    expect(districtPitch).not.toContain("The district foundation is in place");
    expect((districtPitch.match(/padStart/g) ?? []).length).toBe(1);
    expect(districtsPage).toContain("What we have not finished");
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
