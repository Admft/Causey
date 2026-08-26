import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("abuse controls and public-path cost", () => {
  it("drains the email outbox until empty or the cron budget ends", () => {
    const cron = read("app/api/cron/product-email/route.ts");
    expect(cron).toContain("while (Date.now() < deadline)");
    expect(cron).toContain("deliverPendingEmailOutbox(25)");
    expect(read("vercel.json")).toContain('"0 14 * * *"');
  });

  it("rate-limits search, signup, join, claim, CSV, comments, and geo through an allowlisted RPC", () => {
    const sql = read("supabase/migrations/0066_competition_comments_and_home_geo.sql");
    expect(sql).toContain("consume_rate_limit");
    expect(sql).toContain("'comment'");
    expect(sql).toContain("'geo'");
    expect(sql).toContain("security definer");
    expect(read("lib/rate-limit.ts")).toContain('"comment"');
    expect(read("lib/rate-limit.ts")).toContain('"geo"');
    expect(read("app/api/competitions/route.ts")).toContain('consumeRateLimit(\n    "search"');
    expect(read("lib/actions/signup-guard.ts")).toContain('"signup"');
    expect(read("lib/actions/orgs.ts")).toContain('"join_code"');
    expect(read("lib/actions/district.ts")).toContain('"claim"');
    expect(read("lib/actions/district.ts")).toContain('"csv_import"');
    expect(read("lib/actions/comments.ts")).toContain('"comment"');
    expect(read("app/api/geo/nearest-zip/route.ts")).toContain('"geo"');
  });

  it("sends a Content-Security-Policy and skips session refresh on anonymous public GETs", () => {
    const nextConfig = read("next.config.ts");
    expect(nextConfig).toContain("Content-Security-Policy");
    expect(nextConfig).toContain("frame-ancestors 'none'");
    // Empty geolocation=() blocks the browser prompt; self is required for
    // "Use my location" while camera/mic stay denied.
    expect(nextConfig).toContain(
      'value: "camera=(), microphone=(), geolocation=(self)"'
    );
    expect(nextConfig).not.toContain(
      'value: "camera=(), microphone=(), geolocation=()"'
    );
    // Organizer cover photos are arbitrary HTTPS URLs, not only Supabase storage.
    expect(nextConfig).toContain("img-src 'self' data: blob: https:");
    expect(nextConfig).not.toMatch(
      /img-src 'self' data: blob: https:\/\/\*\.supabase\.co"/
    );
    const proxy = read("proxy.ts");
    expect(proxy).toContain("isAnonymousPublicGet");
    expect(proxy).toContain('cookie.name.includes("-auth-token")');
    expect(proxy).toContain("/chess");
  });
});
