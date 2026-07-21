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

  it("returns null when nothing usable exists", () => {
    const html = `<html><body><p>No images here</p></body></html>`;
    expect(extractPageImage(html, base)).toBeNull();
  });
});
