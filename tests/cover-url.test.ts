import { describe, expect, it } from "vitest";
import {
  isEphemeralCoverUrl,
  isHostedCoverUrl,
  organizerCoverUrl,
  toDisplayCoverUrl,
} from "@/lib/cover-url";

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

describe("Google Sites and hosted covers", () => {
  it("strips the dummy =w16383 width so cards can load the photo", () => {
    const token =
      "https://lh3.googleusercontent.com/sitesv/AG8ngQXxX_yJmteJtRrXCxEBMpA2umviau2ZzLvY-6SQS7G-0MrRCDp1uaZV9GSc=w16383";
    expect(toDisplayCoverUrl(token)).toBe(
      "https://lh3.googleusercontent.com/sitesv/AG8ngQXxX_yJmteJtRrXCxEBMpA2umviau2ZzLvY-6SQS7G-0MrRCDp1uaZV9GSc"
    );
    expect(
      toDisplayCoverUrl(
        "http://lh3.googleusercontent.com/sitesv/TOKEN=w16383"
      )
    ).toBe("https://lh3.googleusercontent.com/sitesv/TOKEN");
  });

  it("leaves Google Open Graph sizes that actually serve", () => {
    expect(
      toDisplayCoverUrl(
        "https://lh3.googleusercontent.com/a-/ABC=w1200-h630-p"
      )
    ).toBe("https://lh3.googleusercontent.com/a-/ABC=w1200-h630-p");
  });

  it("classifies signed Google/Facebook covers as ephemeral", () => {
    expect(
      isEphemeralCoverUrl(
        "https://lh3.googleusercontent.com/sitesv/TOKEN=w16383"
      )
    ).toBe(true);
    expect(
      isEphemeralCoverUrl(
        "https://scontent-dfw6-2.xx.fbcdn.net/v/t39.30808-6/photo.jpg"
      )
    ).toBe(true);
    expect(isEphemeralCoverUrl("https://static1.squarespace.com/cover.jpg")).toBe(
      false
    );
  });

  it("recognizes covers already copied into tournament-covers", () => {
    expect(
      isHostedCoverUrl(
        "https://xyz.supabase.co/storage/v1/object/public/tournament-covers/scraped/tla_scrape/abc.jpg"
      )
    ).toBe(true);
    expect(
      isHostedCoverUrl("https://lh3.googleusercontent.com/sitesv/TOKEN")
    ).toBe(false);
  });
});
