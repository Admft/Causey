import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHostListingPreview,
  hostListingSearchNote,
} from "@/lib/host-listing-preview";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("host listing preview", () => {
  it("builds a search-shaped listing with organizer provenance and discipline", () => {
    const result = buildHostListingPreview({
      orgId: "22222222-2222-2222-2222-222222222222",
      orgName: "Northside Chess Club",
      category: "stem",
      customCategoryName: "",
      participationMode: "in_person",
      name: "Spring Robotics Day",
      startDate: "2027-04-12",
      endDate: "",
      regDeadline: "2027-04-01",
      venueName: "Gym",
      address: "100 Main St",
      city: "Austin",
      state: "tx",
      zip: "78701",
      entryFeeCents: 0,
      rated: true,
      imageUrl: "https://example.com/cover.jpg",
      primaryFacet: "robotics",
      mathTypeFacet: "",
      sections: [
        {
          name: "Middle school",
          minRating: null,
          maxRating: null,
          minGrade: 6,
          maxGrade: 8,
          entryFeeCents: null,
        },
      ],
      audience: "public",
    });

    expect(result.source).toBe("organizer");
    expect(result.viewer_org_match).toBe(false);
    expect(result.organizer_name).toBe("Northside Chess Club");
    expect(result.state).toBe("TX");
    expect(result.details.facets).toEqual(["robotics"]);
    expect(result.rated).toBe(false);
    expect(result.sections[0]?.min_grade).toBe(6);
    expect(hostListingSearchNote({ audience: "public", category: "stem" })).toMatch(
      /search/i
    );
    expect(
      hostListingSearchNote({
        audience: "school",
        category: "chess",
        orgType: "club",
      })
    ).toMatch(/Club members/);
  });

  it("renders the create preview with the search card, not a dead link", () => {
    const form = read("components/TournamentCreateForm.tsx");
    const card = read("components/CompetitionCard.tsx");
    const preview = read("components/CompetitionHostPreview.tsx");
    expect(form).toContain("CompetitionHostPreview");
    expect(form).toContain("buildHostListingPreview");
    expect(preview).toContain("Search listing");
    expect(preview).toContain("Event page");
    expect(preview).toContain("<CompetitionCard result={result} preview />");
    expect(card).toContain('preview = false');
    expect(card).toContain("Search listing preview");
  });
});
