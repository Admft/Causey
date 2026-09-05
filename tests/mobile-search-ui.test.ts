import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultPathwaySource as webDefaultSource,
  partnerPromoForCategory,
} from "@/lib/partner-promos";
import { defaultPathwaySource } from "../mobile/src/pathway-source";
import { CHESS_NATIONALS } from "../mobile/src/chess-nationals";

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
    expect(pin).toContain("CHESS_NATIONALS.dek");
    expect(pin).toContain("CHESS_NATIONALS.ctaLabel");
    expect(pin).not.toContain("Local and weekend");
    expect(pin).not.toContain("WebView");
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
