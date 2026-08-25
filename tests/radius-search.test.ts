import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  competitionMatchesRadius,
  radiusBoundingBox,
} from "@/lib/data/search";
import { haversineMiles } from "@/lib/geo";
import {
  SEARCH_PUBLIC_MAX_LIMIT,
  SearchFiltersSchema,
} from "@/lib/schemas";

const radiusSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0061_search_competitions_radius.sql"),
  "utf8"
);
const supabaseSource = readFileSync(
  resolve(process.cwd(), "lib/data/supabase.ts"),
  "utf8"
);
const searchClient = readFileSync(
  resolve(process.cwd(), "components/SearchClient.tsx"),
  "utf8"
);

describe("SQL radius search", () => {
  it("uses earth_distance under invoker RLS and pages in SQL", () => {
    expect(radiusSql).toContain("earth_distance");
    expect(radiusSql).toContain("earth_box");
    expect(radiusSql).toContain("security invoker");
    expect(radiusSql).toContain("participation_mode = 'online'");
    expect(radiusSql).toContain("grant execute");
    expect(radiusSql).toContain("to anon, authenticated");
    expect(supabaseSource).toContain("search_competitions_in_radius");
    expect(supabaseSource).not.toContain("radiusBoundingBox");
  });

  it("caps public page size at 100 and drops load-all", () => {
    expect(SEARCH_PUBLIC_MAX_LIMIT).toBe(100);
    expect(SearchFiltersSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(SearchFiltersSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(searchClient).not.toContain('label: "All"');
    expect(searchClient).toContain("SEARCH_PUBLIC_MAX_LIMIT");
  });

  it("includes online events without coordinates and excludes in-person ones", () => {
    const online = competitionMatchesRadius({
      lat: null,
      lng: null,
      participation_mode: "online",
      originLat: 32.78,
      originLng: -96.8,
      radiusMiles: 50,
    });
    const inPerson = competitionMatchesRadius({
      lat: null,
      lng: null,
      participation_mode: "in_person",
      originLat: 32.78,
      originLng: -96.8,
      radiusMiles: 50,
    });
    expect(online).toEqual({ included: true, distance_miles: null });
    expect(inPerson.included).toBe(false);
  });

  it("rejects coordinates that fit the bounding box but sit outside the true radius", () => {
    const origin = { lat: 32.78, lng: -96.8 };
    const radiusMiles = 50;
    const box = radiusBoundingBox(origin.lat, origin.lng, radiusMiles);
    const corner = { lat: box.maxLat, lng: box.maxLng };
    const distance = haversineMiles(
      origin.lat,
      origin.lng,
      corner.lat,
      corner.lng
    );
    expect(distance).toBeGreaterThan(radiusMiles);
    expect(
      competitionMatchesRadius({
        lat: corner.lat,
        lng: corner.lng,
        participation_mode: "in_person",
        originLat: origin.lat,
        originLng: origin.lng,
        radiusMiles,
      }).included
    ).toBe(false);
  });
});
