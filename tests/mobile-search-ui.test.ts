import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultPathwaySource as webDefaultSource,
  partnerPromoForCategory,
} from "@/lib/partner-promos";
import { GRADE_BANDS, RATING_BANDS } from "@/lib/schemas";
import { competitionSourceOptionsForCategory } from "@/lib/ingestion-sources";
import { defaultPathwaySource } from "../mobile/src/pathway-source";
import { CHESS_NATIONALS } from "../mobile/src/chess-nationals";
import {
  EMPTY_ADVANCED,
  GRADE_OPTIONS,
  RATING_OPTIONS,
  advancedCount,
  orgGoingFilterLabel,
  sourceOptions,
} from "../mobile/src/search-filters";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("phone search matches website discovery chrome", () => {
  it("bundles the same directory marks the website picker uses", () => {
    const marks = read("mobile/src/category-marks.ts");
    for (const id of ["chess", "debate", "stem", "arts", "writing"]) {
      expect(
        existsSync(resolve(process.cwd(), `mobile/assets/categories/${id}.png`))
      ).toBe(true);
      expect(
        existsSync(resolve(process.cwd(), `public/category-marks/${id}.png`))
      ).toBe(true);
      expect(marks).toContain(`../assets/categories/${id}.png`);
    }
  });

  it("lays types in a 3+2 image grid like the homepage hero picker", () => {
    const grid = read("mobile/src/CategoryTileGrid.tsx");
    expect(grid).toContain("3+2");
    expect(grid).toContain("TOP");
    expect(grid).toContain("BOTTOM");
    expect(grid).toContain("CATEGORY_MARKS");
    expect(grid).toContain('id !== "arts"');
    expect(grid).toContain('id === "writing"');
    expect(read("mobile/app/(tabs)/search.tsx")).not.toContain("CATEGORY_MARKS");
  });

  it("pins the chess nationals promise with the same copy as the website", () => {
    const promo = partnerPromoForCategory("chess");
    expect(promo).not.toBeNull();
    expect(CHESS_NATIONALS.headline).toBe(promo!.headline);
    expect(CHESS_NATIONALS.dek).toBe(promo!.dek);
    expect(CHESS_NATIONALS.honesty).toBe(promo!.honesty);
    expect(CHESS_NATIONALS.ctaLabel).toBe(promo!.ctaLabel);
    expect(CHESS_NATIONALS.eyebrow).toBe(promo!.eyebrow);
    expect(CHESS_NATIONALS.honesty).toMatch(/not an official US Chess ruling/i);

    const pin = read("mobile/src/ChessNationalsPin.tsx");
    expect(pin).toContain("CHESS_NATIONALS.headline");
    expect(pin).toContain("CHESS_NATIONALS.ctaLabel");
    expect(pin).toContain("CHESS_NATIONALS.honesty");
    expect(pin).toContain('alignSelf: "flex-end"');
    expect(pin).toContain('overflow: "hidden"');
    expect(pin).toContain("PinSheen");
    expect(pin).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(pin).not.toContain("CHESS_NATIONALS.dek");
    expect(pin).not.toContain("CHESS_NATIONALS.eyebrow");
    expect(pin).not.toContain("Local and weekend");
    expect(pin).not.toContain("WebView");

    const search = read("mobile/app/(tabs)/search.tsx");
    expect(search.indexOf('label="Search"')).toBeLessThan(
      search.indexOf("<ChessNationalsPin")
    );
    expect(search.indexOf("<ChessNationalsPin")).toBeLessThan(
      search.indexOf("{error ? <ErrorText>{error}</ErrorText> : null}")
    );
  });

  it("keeps a simple name/zip search and puts website filters behind Advanced search", () => {
    const search = read("mobile/app/(tabs)/search.tsx");
    const advanced = read("mobile/src/AdvancedSearch.tsx");
    const filters = read("mobile/src/search-filters.ts");
    const ui = read("mobile/src/ui.tsx");
    const competitions = read("app/api/competitions/route.ts");
    const data = read("lib/data/index.ts");

    expect(search).toContain('label="Tournament name"');
    expect(search).toContain('label="Zip"');
    expect(search).toContain("Advanced search");
    expect(search).toContain("AdvancedSearch");
    expect(search).toContain('params.set("radius_miles"');
    expect(search).toContain('params.set("featured", "1")');
    expect(search).toContain('params.set("club_going", "1")');
    expect(search).toContain('params.set("grade_band"');
    expect(search).toContain('params.set("rating_band"');
    expect(search).toContain('"max_fee_cents"');
    expect(search).toContain('params.set("date_from"');
    expect(search).toContain('params.set("date_to"');
    expect(search).toContain('params.set("facet"');
    expect(search).toContain('params.set("source"');
    expect(search).toContain('params.set("state"');
    expect(search).toContain("session?.access_token");
    expect(search.indexOf('label="Search"')).toBeLessThan(
      search.indexOf("Advanced search")
    );

    expect(advanced).toContain('label="When"');
    expect(advanced).toContain("Featured only");
    expect(advanced).toContain("Listing source");
    expect(advanced).toContain("Entry fee");
    expect(advanced).toContain("From date");
    expect(advanced).toContain("clubGoingLabel");
    expect(filters).toContain('value: "ended"');
    expect(filters).toContain("My club is going");
    expect(filters).toContain("My school is going");
    expect(ui).toContain("export function SelectField");

    expect(competitions).toContain("getRequestDataSource(request)");
    expect(competitions).toContain("accessTokenFromRequest(request)");
    expect(data).toContain("createSupabaseClientWithAccessToken");
  });

  it("uses the same grade, rating, and live sources as the website rail", () => {
    expect(
      GRADE_OPTIONS.filter((option) => option.value).map((option) => option.value)
    ).toEqual(Object.keys(GRADE_BANDS));
    expect(
      RATING_OPTIONS.filter((option) => option.value).map((option) => option.value)
    ).toEqual(Object.keys(RATING_BANDS));
    for (const category of ["chess", "debate", "stem", "arts", "writing"] as const) {
      expect(
        sourceOptions(category)
          .filter((option) => option.value)
          .map((option) => option.value)
      ).toEqual(
        competitionSourceOptionsForCategory(category).map((option) => option.value)
      );
    }
    expect(orgGoingFilterLabel(["school"])).toBe("My school is going");
    expect(orgGoingFilterLabel(["club"])).toBe("My club is going");
    expect(advancedCount(EMPTY_ADVANCED)).toBe(0);
    expect(
      advancedCount({ ...EMPTY_ADVANCED, timing: "ended", featured: true })
    ).toBe(2);
  });

  it("defaults the phone explorer to a state series the same way the website does", () => {
    const series = [
      { id: "11111111-1111-4111-8111-111111111111", level: "national" as const },
      { id: "22222222-2222-4222-8222-222222222222", level: "state" as const },
    ];
    const competitions = [{ id: "33333333-3333-4333-8333-333333333333" }];
    expect(defaultPathwaySource({ series, competitions })).toBe(
      webDefaultSource({ series, competitions })
    );
  });

  it("walks GET /api/pathways instead of inventing hops", () => {
    const explorer = read("mobile/src/PathwayExplorer.tsx");
    expect(explorer).toContain('causeyFetch("/api/pathways")');
    expect(explorer).toContain("/api/pathways?source=");
    expect(explorer).toContain("1st place");
    expect(explorer).toContain("not an official US Chess ruling");
    expect(explorer).toContain("seeded scaffolding");
    expect(explorer).toContain("EventPathways");
    expect(explorer).not.toContain("WebView");
  });
});
