import { describe, expect, it } from "vitest";
import { organizerCoverUrl, toDisplayCoverUrl } from "@/lib/cover-url";

describe("toDisplayCoverUrl", () => {
  it("upgrades scraped http covers to https for CSP", () => {
    expect(
      toDisplayCoverUrl(
        "http://static1.squarespace.com/static/cover.png?format=1500w"
      )
    ).toBe("https://static1.squarespace.com/static/cover.png?format=1500w");
  });

  it("leaves https covers unchanged", () => {
    expect(toDisplayCoverUrl("https://new.uschess.org/sites/flyer.jpg")).toBe(
      "https://new.uschess.org/sites/flyer.jpg"
    );
  });

  it("returns null for missing or non-http(s) values", () => {
    expect(toDisplayCoverUrl(null)).toBeNull();
    expect(toDisplayCoverUrl("")).toBeNull();
    expect(toDisplayCoverUrl("javascript:alert(1)")).toBeNull();
    expect(toDisplayCoverUrl("not a url")).toBeNull();
  });

  it("does not treat source logos or FIDE Open Graph defaults as event photos", () => {
    expect(
      organizerCoverUrl("https://directory.fide.com/img/fide_og_1200.png")
    ).toBeNull();
    expect(organizerCoverUrl("https://example.com/site-logo.png")).toBeNull();
    expect(organizerCoverUrl("https://organizer.example/flyer.jpg")).toBe(
      "https://organizer.example/flyer.jpg"
    );
  });
});
