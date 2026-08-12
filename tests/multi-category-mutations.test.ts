import { describe, expect, it, vi } from "vitest";
import { TournamentUpdateSchema } from "@/lib/validation/tournament";

vi.mock("server-only", () => ({}));

const values = TournamentUpdateSchema.parse({
  competitionId: "11111111-1111-1111-1111-111111111111",
  eventSlug: "illustrative-stem-challenge",
  orgSlug: "illustrative-school",
  category: "stem",
  customCategoryName: "",
  participationMode: "online",
  name: "Illustrative STEM Challenge",
  startDate: "2027-03-20",
  endDate: null,
  regDeadline: null,
  venueName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  entryFeeCents: 0,
  regUrl: null,
  visibility: "private",
  audience: "school",
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
});

describe("atomic multi-category mutations", () => {
  it("updates metadata and divisions through one database RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "illustrative-stem-challenge",
      error: null,
    });
    const { updateTournamentRecord } = await import(
      "@/lib/data/tournament-mutations"
    );

    const result = await updateTournamentRecord({
      supabase: { rpc } as never,
      values,
      zipRow: { lat: null, lng: null },
    });

    expect(result).toEqual({
      ok: true,
      slug: "illustrative-stem-challenge",
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      "update_competition_with_sections",
      expect.objectContaining({
        p_competition_id: values.competitionId,
        p_values: expect.objectContaining({
          category: "stem",
          participation_mode: "online",
          city: null,
          rated: false,
          rating_system: null,
        }),
        p_sections: [
          expect.objectContaining({
            name: "Middle school",
            min_rating: null,
            max_rating: null,
            min_grade: 6,
            max_grade: 8,
          }),
        ],
      })
    );
  });

  it("reports one failure instead of claiming partially saved details", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "division insert failed" },
    });
    const { updateTournamentRecord } = await import(
      "@/lib/data/tournament-mutations"
    );

    const result = await updateTournamentRecord({
      supabase: { rpc } as never,
      values,
      zipRow: { lat: null, lng: null },
    });

    expect(result).toEqual({
      ok: false,
      error: "Could not save the competition and its divisions. Try again.",
    });
  });
});
