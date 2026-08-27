import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("competition covers stay aligned in search", () => {
  it("falls back to the listing source mark when a photo is missing or fails", () => {
    const cover = read("components/CompetitionCoverImage.tsx");
    expect(cover).toContain("sourceByCompetitionSource");
    expect(cover).toContain("sourceFallback = true");
    expect(cover).toContain("onError={() => setFailed(true)}");
    expect(cover).toContain("toDisplayCoverUrl");
    expect(cover).toContain("CauseyLogo");
    expect(cover).toContain("bg-org-gold-soft");
  });

  it("always renders a cover slot on grid cards so mixed rows do not stretch", () => {
    const card = read("components/CompetitionCard.tsx");
    expect(card).toContain("source={result.source}");
    expect(card).toContain("h-full flex-col");
    expect(card).not.toContain("hasVisual");
    expect(read("components/ResultsLayoutToggle.tsx")).toContain(
      "items-stretch"
    );
    expect(read("app/event/[slug]/page.tsx")).toContain(
      "source={competition.source}"
    );
    expect(read("ingestion/persist.ts")).toContain("resolvePersistedCoverUrl");
    expect(read("lib/cover-url.ts")).toContain("stripGoogleSitesMaxWidth");
  });

  it("requires a cover before an organization can preview or publish", () => {
    const form = read("components/TournamentCreateForm.tsx");
    expect(form).toContain("Cover image");
    expect(form).toContain("Required");
    expect(form).toContain(
      "Add a cover image before previewing the competition."
    );
    expect(read("lib/actions/tournaments.ts")).toContain(
      "Add a cover image before publishing."
    );
  });
});
