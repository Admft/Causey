import { describe, expect, it } from "vitest";
import { TournamentDraftDataSchema } from "@/lib/schemas";

describe("TournamentDraftDataSchema", () => {
  it("accepts an incomplete draft and fills resumable defaults", () => {
    expect(TournamentDraftDataSchema.parse({})).toEqual({
      category: "chess",
      customCategoryName: "",
      participationMode: "in_person",
      name: "",
      startDate: "",
      endDate: "",
      regDeadline: "",
      venueName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      entryFee: "",
      regUrl: "",
      visibility: "private",
      rated: false,
      primaryFacet: "",
      mathTypeFacet: "",
    });
  });

  it("preserves organizer choices while the draft is incomplete", () => {
    const draft = TournamentDraftDataSchema.parse({
      name: "District Chess Day",
      visibility: "public",
      rated: true,
    });

    expect(draft.name).toBe("District Chess Day");
    expect(draft.visibility).toBe("public");
    expect(draft.rated).toBe(true);
    expect(draft.startDate).toBe("");
  });

  it("rejects values that cannot fit the publish form", () => {
    expect(
      TournamentDraftDataSchema.safeParse({ name: "x".repeat(121) }).success
    ).toBe(false);
  });
});
