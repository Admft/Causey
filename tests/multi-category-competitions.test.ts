import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  competitionTypeLabel,
  CREATABLE_COMPETITION_TYPES,
} from "@/lib/competition-types";
import { buildCompetitionResult } from "@/lib/data/search";
import {
  CompetitionSchema,
  SearchFiltersSchema,
} from "@/lib/schemas";
import {
  primaryFacetsForCategory,
  requiredOrganizerFacetMessage,
} from "@/lib/category-discovery";
import { TournamentCreateSchema } from "@/lib/validation/tournament";

const baseCompetition = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "illustrative-stem-challenge",
  name: "Illustrative STEM Challenge",
  category: "stem",
  custom_category_name: null,
  participation_mode: "online",
  series_id: null,
  organizer_name: "Illustrative School",
  venue_name: null,
  address: null,
  city: null,
  state: null,
  zip: null,
  lat: null,
  lng: null,
  start_date: "2027-03-20",
  end_date: null,
  reg_deadline: null,
  reg_url: null,
  entry_fee_cents: 0,
  rated: false,
  rating_system: null,
  source: "organizer",
  source_url: null,
  image_url: null,
  status: "published",
  visibility: "private",
  audience: "school",
  org_id: "22222222-2222-2222-2222-222222222222",
  created_by: "33333333-3333-3333-3333-333333333333",
  details: {},
  pathway_status: "none",
  pathway_summary: null,
  pathway_related: [],
  interest_count: 0,
};

const validCreate = {
  orgId: "22222222-2222-2222-2222-222222222222",
  orgSlug: "illustrative-school",
  category: "other" as const,
  customCategoryName: "Spelling bee",
  participationMode: "online" as const,
  name: "Illustrative Spring Spelling Bee",
  startDate: "2027-04-12",
  endDate: null,
  regDeadline: null,
  venueName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  entryFeeCents: 0,
  regUrl: null,
  visibility: "private" as const,
  audience: "school" as const,
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
  rated: false,
};

const stemCreate = {
  ...validCreate,
  category: "stem" as const,
  customCategoryName: "",
  primaryFacet: "robotics",
};

const chessCreate = {
  ...validCreate,
  category: "chess" as const,
  customCategoryName: "",
  primaryFacet: "",
  rated: true,
};

describe("multi-category competition contract", () => {
  it("parses an online non-chess competition without a physical location", () => {
    const parsed = CompetitionSchema.parse(baseCompetition);
    expect(parsed.category).toBe("stem");
    expect(parsed.participation_mode).toBe("online");
    expect(parsed.city).toBeNull();
    expect(parsed.rating_system).toBeNull();
  });

  it("requires a name when Other is selected", () => {
    expect(TournamentCreateSchema.safeParse(validCreate).success).toBe(true);
    expect(
      TournamentCreateSchema.safeParse({
        ...validCreate,
        customCategoryName: "",
      }).success
    ).toBe(false);
  });

  it("requires a discipline for types that have one and never defaults to chess", () => {
    expect(TournamentCreateSchema.safeParse(stemCreate).success).toBe(true);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        primaryFacet: "",
      }).success
    ).toBe(false);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        primaryFacet: "mathematics",
        mathTypeFacet: "",
      }).success
    ).toBe(true);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        category: "arts",
        primaryFacet: "music",
      }).success
    ).toBe(true);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        category: "arts",
        primaryFacet: "",
      }).success
    ).toBe(false);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        category: "writing",
        primaryFacet: "poetry",
      }).success
    ).toBe(true);
    expect(
      TournamentCreateSchema.safeParse({
        ...stemCreate,
        category: "debate",
        primaryFacet: "public_forum",
      }).success
    ).toBe(true);
    expect(TournamentCreateSchema.safeParse(chessCreate).success).toBe(true);
    expect(TournamentCreateSchema.safeParse(validCreate).success).toBe(true);
    expect(requiredOrganizerFacetMessage("chess")).toBeNull();
    expect(requiredOrganizerFacetMessage("other")).toBeNull();
    expect(requiredOrganizerFacetMessage("stem")).toMatch(/required/i);
    expect(primaryFacetsForCategory("stem").map((facet) => facet.value)).toEqual(
      [
        "robotics",
        "science_fair",
        "mathematics",
        "science_bowl",
        "biology",
        "chemistry",
        "physics",
        "engineering",
        "computer_science",
      ]
    );
    expect(
      TournamentCreateSchema.safeParse({
        ...validCreate,
        category: "",
      }).success
    ).toBe(false);
    expect(
      TournamentCreateSchema.safeParse({
        ...validCreate,
        category: undefined,
      }).success
    ).toBe(false);
  });

  it("requires location for in-person competitions but not online ones", () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validCreate,
        participationMode: "in_person",
      }).success
    ).toBe(false);
    expect(TournamentCreateSchema.safeParse(validCreate).success).toBe(true);
  });

  it("isolates chess search from non-chess records", () => {
    const competition = CompetitionSchema.parse(baseCompetition);
    const hit = buildCompetitionResult({
      competition,
      sections: [],
      series: null,
      distance_miles: null,
      filters: SearchFiltersSchema.parse({
        category: "chess",
        timing: "all",
      }),
    });
    expect(hit).toBeNull();
  });

  it("uses a controlled registry and preserves custom labels", () => {
    expect(CREATABLE_COMPETITION_TYPES.map((type) => type.id)).toEqual([
      "chess",
      "stem",
      "debate",
      "arts",
      "writing",
      "other",
    ]);
    expect(
      competitionTypeLabel({
        category: "other",
        customCategoryName: "Academic decathlon",
      })
    ).toBe("Academic decathlon");
    expect(competitionTypeLabel({ category: "" })).toBe("Type not chosen");
  });

  it("keeps district authority and category checks at the database boundary", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0041_multi_category_competitions.sql"
      ),
      "utf8"
    );
    expect(migration).toContain("competitions_category_check");
    expect(migration).toContain("competitions_location_by_mode_check");
    expect(migration).toContain("can_operate_org_competitions");
    expect(migration).toContain("public.is_district_admin");
    expect(migration).toMatch(
      /create policy "competitions_update_manager"[\s\S]*public\.can_manage_competition\(id, auth\.uid\(\)\)/
    );
    expect(migration).toContain("update_competition_with_sections");
    expect(migration).toContain(
      "perform public.replace_competition_sections"
    );
  });

  it("preserves a draft when its divisions fail to publish", () => {
    const actions = readFileSync(
      resolve(process.cwd(), "lib/actions/tournaments.ts"),
      "utf8"
    );
    expect(actions).toContain(
      "const { error: sectionError } = await supabase.from(\"sections\").insert"
    );
    expect(actions).toContain(
      "The competition draft was preserved because its divisions could not be published."
    );
  });

  it("uses semantic organization provenance styling in result cards", () => {
    const card = readFileSync(
      resolve(process.cwd(), "components/CompetitionCard.tsx"),
      "utf8"
    );
    const tokens = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8"
    );
    expect(card).toContain("viewer_org_match");
    expect(card).toContain("Organization hosted");
    expect(card).toContain("border-org-gold");
    expect(tokens).toContain("--org-gold");
  });

  it("hosts with required discipline chips and no silent chess default", () => {
    const form = readFileSync(
      resolve(process.cwd(), "components/TournamentCreateForm.tsx"),
      "utf8"
    );
    const validation = readFileSync(
      resolve(process.cwd(), "lib/validation/tournament.ts"),
      "utf8"
    );
    expect(form).toContain("CategoryGraphic");
    expect(form).toContain("host-discipline-label");
    expect(form).toContain("primaryFacetsForCategory(category)");
    expect(form).toContain("requiredOrganizerFacetMessage");
    expect(form).not.toContain("Not tagged yet");
    expect(form).toContain("CompetitionHostPreview");
    expect(form).not.toContain('category || "chess"');
    expect(form.indexOf("What it is")).toBeLessThan(
      form.indexOf('Cover image{" "}')
    );
    expect(form.indexOf('Cover image{" "}')).toBeLessThan(
      form.indexOf("Schedule and place")
    );
    expect(validation).toContain("requiredOrganizerFacetMessage");
    expect(validation).not.toContain('CompetitionCategorySchema.default("chess")');
    const page = readFileSync(
      resolve(process.cwd(), "app/orgs/[slug]/competitions/new/page.tsx"),
      "utf8"
    );
    expect(page.indexOf("Hosting organization")).toBeLessThan(
      page.indexOf("<TournamentCreateForm")
    );
  });
});
