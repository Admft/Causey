import { describe, expect, it } from "vitest";
import {
  resolvePersistedCoverUrl,
  scrapedCoverPath,
  sniffCoverMime,
} from "@/ingestion/rehost-cover";

describe("scraped cover rehost helpers", () => {
  it("sniffs jpeg, png, and webp magic bytes", () => {
    expect(sniffCoverMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), null)).toBe(
      "image/jpeg"
    );
    expect(
      sniffCoverMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), null)
    ).toBe("image/png");
    expect(
      sniffCoverMime(
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.alloc(4),
          Buffer.from("WEBP"),
        ]),
        null
      )
    ).toBe("image/webp");
    expect(sniffCoverMime(Buffer.from("<html>"), "text/html")).toBeNull();
  });

  it("stores scraped covers under a stable public path", () => {
    expect(scrapedCoverPath("tla_scrape", "abc-id", "jpg")).toBe(
      "scraped/tla_scrape/abc-id.jpg"
    );
  });

  it("keeps durable organizer URLs without copying them", async () => {
    await expect(
      resolvePersistedCoverUrl({
        incoming: "https://static1.squarespace.com/cover.jpg",
        existing: null,
        client: {} as never,
        source: "tla_scrape",
        competitionId: "id",
      })
    ).resolves.toBe("https://static1.squarespace.com/cover.jpg");
  });

  it("keeps an already hosted cover when Google rehost is skipped", async () => {
    const previous = process.env.SCRAPE_REHOST_COVERS;
    process.env.SCRAPE_REHOST_COVERS = "0";
    const hosted =
      "https://xyz.supabase.co/storage/v1/object/public/tournament-covers/scraped/tla_scrape/id.jpg";
    try {
      await expect(
        resolvePersistedCoverUrl({
          incoming: "https://lh3.googleusercontent.com/sitesv/TOKEN",
          existing: hosted,
          client: {} as never,
          source: "tla_scrape",
          competitionId: "id",
        })
      ).resolves.toBe(hosted);
    } finally {
      if (previous === undefined) delete process.env.SCRAPE_REHOST_COVERS;
      else process.env.SCRAPE_REHOST_COVERS = previous;
    }
  });
});
