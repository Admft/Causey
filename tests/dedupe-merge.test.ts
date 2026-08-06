import { describe, expect, it } from "vitest";
import { mergeCompetitionFields } from "@/ingestion/dedupe";

describe("mergeCompetitionFields", () => {
  it("fills sparse winner fields from losers without overwriting", () => {
    const patch = mergeCompetitionFields(
      {
        id: "w",
        source: "tla_scrape",
        fingerprint: "x",
        status: "published",
        canonical_id: null,
        reg_url: null,
        source_url: "https://tla.example/a",
        address: null,
        city: "Austin",
        zip: "00000",
        lat: 0,
        lng: 0,
        entry_fee_cents: null,
        reg_deadline: null,
        image_url: null,
        organizer_name: "TLA Org",
        venue_name: null,
        details: { a: 1 },
      },
      [
        {
          id: "l",
          source: "onlinereg_scrape",
          fingerprint: "x",
          status: "draft",
          canonical_id: null,
          reg_url: "https://reg.example",
          source_url: "https://or.example/b",
          address: "1 Main",
          city: "Austin",
          zip: "78701",
          lat: 30.2,
          lng: -97.7,
          entry_fee_cents: 4500,
          reg_deadline: "2026-08-01",
          image_url: null,
          organizer_name: "Other",
          venue_name: "Hall",
          details: { a: 9, catalog_standing: "local" },
        },
      ]
    );

    expect(patch.reg_url).toBe("https://reg.example");
    expect(patch.address).toBe("1 Main");
    expect(patch.zip).toBe("78701");
    expect(patch.lat).toBe(30.2);
    expect(patch.organizer_name).toBeUndefined(); // winner already had one
    expect(patch.details).toMatchObject({ a: 1, catalog_standing: "local" });
  });
});
