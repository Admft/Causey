import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultPathwaySource,
  partnerPromoForCategory,
  PARTNER_PROMOS,
} from "@/lib/partner-promos";
import { PUBLIC_DISCOVERY_CATEGORY_IDS } from "@/lib/category-discovery";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("chess nationals placement", () => {
  it("pins one chess promo into pathways and nowhere else", () => {
    const promo = partnerPromoForCategory("chess");
    expect(promo?.id).toBe("us-chess-nationals");
    expect(promo?.headline).toBe("Get your kid to chess nationals");
    expect(promo?.ctaLabel).toBe("See the pathways");
    expect(promo?.href).toBe("/pathways");
    expect(promo?.eyebrow).toBe("Chess pathways");
    expect(promo?.honesty).toMatch(/not an official US Chess ruling/i);
    expect(promo?.honesty).not.toMatch(/sample/i);
    expect(JSON.stringify(PARTNER_PROMOS)).not.toMatch(/sample/i);
    expect(PARTNER_PROMOS).toHaveLength(1);
    expect(PARTNER_PROMOS.every((item) => item.category === "chess")).toBe(true);

    for (const category of PUBLIC_DISCOVERY_CATEGORY_IDS) {
      if (category === "chess") continue;
      expect(partnerPromoForCategory(category)).toBeNull();
    }
  });

  it("sits above chess results as a labeled pin, not a ranking boost", () => {
    const searchClient = read("components/SearchClient.tsx");
    const slot = read("components/PartnerPromoSlot.tsx");
    const search = read("lib/data/search.ts");
    const standing = read("lib/event-standing.ts");

    expect(searchClient).toContain("partnerPromoForCategory(category)");
    expect(searchClient).toContain("PartnerPromoSlot");
    expect(read("components/HomeFeaturedSection.tsx")).toContain("PartnerPromoSlot");
    expect(slot).toContain('href={promo.href}');
    expect(slot).toContain("{promo.headline}");
    expect(search).not.toContain("partner-promos");
    expect(search).not.toContain("PARTNER_PROMOS");
    expect(standing).not.toContain("partner-promos");
    expect(slot).not.toContain("isFeaturedStanding");
    expect(slot).not.toContain("Official US Chess");
    expect(slot).not.toContain("endorsed");
  });

  it("opens pathways on the same nationals promise with illustrative rules", () => {
    const page = read("app/pathways/page.tsx");
    const explorer = read("components/PathwayExplorer.tsx");

    expect(page).toContain("Chess qualification pathways");
    expect(page).toContain("Illustrative lookup");
    expect(page).toContain("seeded scaffolding");
    expect(page).toContain("chessNationals.headline");
    expect(page).toContain("not an official US Chess ruling");
    expect(explorer).toContain("defaultPathwaySource");
    expect(explorer).toContain("illustrative lookup");
  });

  it("defaults the explorer to a state championship series when one exists", () => {
    expect(
      defaultPathwaySource({
        series: [
          { id: "11111111-1111-4111-8111-111111111111", level: "national" },
          { id: "22222222-2222-4222-8222-222222222222", level: "state" },
        ],
        competitions: [{ id: "33333333-3333-4333-8333-333333333333" }],
      })
    ).toBe("series:22222222-2222-4222-8222-222222222222");

    expect(
      defaultPathwaySource({
        series: [],
        competitions: [{ id: "33333333-3333-4333-8333-333333333333" }],
      })
    ).toBe("competition:33333333-3333-4333-8333-333333333333");

    expect(defaultPathwaySource({ series: [], competitions: [] })).toBe("");
  });
});
