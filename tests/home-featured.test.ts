import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HOME_FEATURED_LIMIT,
  HOME_FEATURED_RADIUS_MILES,
  hasOrganizerCover,
  homeFeaturedCopy,
  pickHomeFeatured,
  shuffleWithDaySeed,
} from "@/lib/home-featured";

const homePage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");
const featuredSection = readFileSync(
  resolve(process.cwd(), "components/HomeFeaturedSection.tsx"),
  "utf8"
);
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0066_competition_comments_and_home_geo.sql"),
  "utf8"
);

describe("homepage featured listings", () => {
  it("keeps the strip on desktop only and names a zip-aware nearby heading", () => {
    expect(homePage).toContain("HomeFeaturedSection");
    expect(homePage).toContain("getHomeFeaturedCompetitions");
    expect(featuredSection).toContain("hidden");
    expect(featuredSection).toContain("md:block");
    expect(featuredSection).toContain("section-rule");
    expect(featuredSection).toContain("{featured.copy.searchLabel}");
    expect(homeFeaturedCopy("nearby", "75201").heading).toBe(
      "Browse tournaments near 75201"
    );
    expect(homeFeaturedCopy("photos", null).heading).toBe("Browse tournaments");
    expect(homeFeaturedCopy("photos", null).searchHref).toBe("/chess");
    expect(homeFeaturedCopy("photos", null).searchLabel).toBe(
      "See more chess tournaments"
    );
    expect(homeFeaturedCopy("nearby", "75201").searchHref).toBe(
      `/chess?zip=75201&radius=${HOME_FEATURED_RADIUS_MILES}`
    );
    expect(homeFeaturedCopy("nearby", "75201").blurb).toContain(
      String(HOME_FEATURED_RADIUS_MILES)
    );
    expect(homeFeaturedCopy("photos", null).blurb).not.toMatch(/ranking/i);
    expect(
      readFileSync(resolve(process.cwd(), "lib/data/home-featured.ts"), "utf8")
    ).toContain('category: "chess"');
  });

  it("prefers organizer photos and does not invent rows", () => {
    expect(hasOrganizerCover("https://organizer.example/flyer.jpg")).toBe(true);
    expect(hasOrganizerCover("http://organizer.example/flyer.jpg")).toBe(true);
    expect(hasOrganizerCover(null)).toBe(false);
    expect(hasOrganizerCover("not-a-url")).toBe(false);

    const pool = [
      { id: "a", image_url: "https://cdn.example/a.jpg" },
      { id: "b", image_url: null },
      { id: "c", image_url: "https://cdn.example/c.jpg" },
    ];
    expect(pickHomeFeatured(pool, "photos", "2026-08-26").map((row) => row.id)).toEqual(
      expect.arrayContaining(["a", "c"])
    );
    expect(pickHomeFeatured(pool, "photos", "2026-08-26")).toHaveLength(2);
    expect(pickHomeFeatured(pool, "nearby", "2026-08-26")[0]?.id).toBe("a");
    expect(pickHomeFeatured(pool, "nearby", "2026-08-26")).toHaveLength(
      Math.min(HOME_FEATURED_LIMIT, pool.length)
    );
  });

  it("shuffles the photo sample the same way for a given day", () => {
    const pool = ["one", "two", "three", "four", "five", "six"];
    expect(shuffleWithDaySeed(pool, "2026-08-26")).toEqual(
      shuffleWithDaySeed(pool, "2026-08-26")
    );
    expect(shuffleWithDaySeed(pool, "2026-08-26")).not.toEqual(
      shuffleWithDaySeed(pool, "2026-08-27")
    );
  });

  it("looks up the nearest zip without exposing the full zip table to a custom grant", () => {
    expect(migration).toContain("create or replace function public.nearest_zip");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).toContain("zips_earth_idx");
  });
});
