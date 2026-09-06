"use client";

/*
 * Plain anchors on purpose. The router lives in the tree that just failed, so
 * every link out of here has to be a full document load.
 */
/* eslint-disable @next/next/no-html-link-for-pages */

import "./globals.css";

/**
 * Last resort: the root layout itself failed, so there is no header, no nav,
 * and no styling to rely on. Everything a person needs to get out is written
 * inline here — a retry, a link home, and a link to support — because the
 * stylesheet is one of the things that may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "clamp(2rem, 8vw, 5rem) 1.25rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#1c1917",
          background: "#fdfcfb",
        }}
      >
        <div style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Causey could not start this page.
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#57534e",
            }}
          >
            Something failed before the page could render
            {error.digest ? ` (reference ${error.digest})` : ""}. Nothing you
            were doing was saved or changed. Try again, or go back to search.
          </p>
          <div
            style={{
              marginTop: "1.75rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "1.25rem",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: "0.625rem",
                padding: "0.7rem 1.1rem",
                background: "#b91c1c",
                color: "#fff",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                color: "#57534e",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              Go to the homepage
            </a>
            <a
              href="/support"
              style={{
                color: "#57534e",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              Report a problem
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
