import { describe, expect, it } from "vitest";
import { extractPageImage } from "@/ingestion/extract-page-image";

describe("extractPageImage", () => {
  const base = "https://organizer.example.com/events/spring-open";

  it("prefers og:image", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="/media/spring-open.jpg" />
        <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg" />
      </head><body>
        <main><img src="/media/other.jpg" width="800" height="500" /></main>
      </body></html>
    `;
    expect(extractPageImage(html, base)).toBe(
      "https://organizer.example.com/media/spring-open.jpg"
    );
  });

  it("rejects favicons and logos", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://example.com/favicon-32x32.png" />
      </head><body>
        <main><img src="/assets/site-logo.png" width="200" height="80" /></main>
      </body></html>
    `;
    expect(extractPageImage(html, base)).toBeNull();
  });

  it("never returns shared site chrome as an event image", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://example.com/site-logo.png" />
      </head><body></body></html>
    `;
    expect(extractPageImage(html, base)).toBeNull();
  });

  it("rejects US Chess sales banner ads so organizer fallback can run", () => {
    const html = `
      <html><body>
        <div class="field field-name-body">
          <p><a href="https://www.uscfsales.com"><img
            alt="Banner Ad: US Chess Sales"
            src="/sites/default/files/media/images/stalemate-save10.jpg"
            width="728" height="90" /></a></p>
        </div>
      </body></html>
    `;
    expect(
      extractPageImage(html, "https://new.uschess.org/some-event")
    ).toBeNull();
  });

  it("falls back to a large content image", () => {
    const html = `
      <html><body>
        <main>
          <img src="/icons/tiny.png" width="32" height="32" />
          <img src="/photos/hall.jpg" width="1200" height="800" alt="Playing hall" />
        </main>
      </body></html>
    `;
    expect(extractPageImage(html, base)).toBe(
      "https://organizer.example.com/photos/hall.jpg"
    );
  });

  it("upgrades http og:image to https so CSP can load the cover", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="http://static1.squarespace.com/static/cover.png" />
      </head><body></body></html>
    `;
    expect(extractPageImage(html, base)).toBe(
      "https://static1.squarespace.com/static/cover.png"
    );
  });

  it("uses the largest responsive image instead of a placeholder src", () => {
    const html = `
      <html><body><main>
        <img src="/placeholder.png"
             srcset="/cover-480.jpg 480w, /cover-1440.jpg 1440w"
             width="1440" height="900" alt="Tournament" />
      </main></body></html>
    `;
    expect(extractPageImage(html, base)).toBe(
      "https://organizer.example.com/cover-1440.jpg"
    );
  });

  it("returns null when nothing usable exists", () => {
    const html = `<html><body><p>No images here</p></body></html>`;
    expect(extractPageImage(html, base)).toBeNull();
  });
});
