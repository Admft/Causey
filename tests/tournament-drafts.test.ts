import { describe, expect, it } from "vitest";
import { TournamentDraftDataSchema } from "@/lib/schemas";

describe("TournamentDraftDataSchema", () => {
  it("keeps incomplete server-backed drafts valid", () => {
    expect(TournamentDraftDataSchema.parse({})).toEqual({
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
    });
  });

  it("rejects draft values beyond publish field limits", () => {
    const parsed = TournamentDraftDataSchema.safeParse({
      name: "x".repeat(121),
    });
    expect(parsed.success).toBe(false);
  });
});
