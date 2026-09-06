import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatAlertTime,
  inAppEventPath,
  isWebsiteOnlyHref,
  websiteHrefToOpen,
} from "../mobile/src/alerts";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile alerts API", () => {
  it("lists the signed-in recipient's notifications with an unread count", () => {
    const route = read("app/api/mobile/alerts/route.ts");
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain('from("notifications")');
    expect(route).toContain('eq("recipient_id", auth.user.id)');
    expect(route).toContain(".limit(50)");
    expect(route).toContain("unread_count");
    expect(route).toContain("id, kind, title, body, href, read_at, created_at");
    expect(route).toContain("status: 403");
    expect(route).not.toContain("lib/data/district");
    expect(route).not.toContain("createServerSupabaseClient");
    expect(route).not.toContain("direct_message");
    expect(route).not.toContain("from(\"comments\")");
  });

  it("marks one or all unread rows read for that recipient only", () => {
    const route = read("app/api/mobile/alerts/route.ts");
    const website = read("lib/actions/notifications.ts");
    expect(route).toContain("export async function POST");
    expect(route).toContain("all: z.literal(true)");
    expect(route).toContain('update({ read_at:');
    expect(route).toContain('is("read_at", null)');
    expect(route).toContain('eq("id", id)');
    expect(route).toContain('count: "exact"');
    expect(website).toContain('eq("recipient_id", user.id)');
    expect(website).toContain('is("read_at", null)');
  });
});

describe("mobile alerts screen", () => {
  it("lists title, body, and date, and never WebViews website-only hrefs", () => {
    const screen = read("mobile/app/alerts.tsx");
    expect(screen).toContain(
      "No alerts yet. Invitations and results show up here."
    );
    expect(screen).toContain("Mark all read");
    expect(screen).toContain("unread_count: 0");
    expect(screen).toContain("Open on the website");
    expect(screen).toContain("router.push(eventPath)");
    expect(screen).toContain("inAppEventPath");
    expect(screen).toContain("isWebsiteOnlyHref");
    expect(screen).toContain("websiteHrefToOpen");
    expect(screen).toContain("openExternalUrl");
    expect(screen).toContain("Try again");
    expect(screen).toContain("fontWeight: \"800\"");
    expect(screen).not.toContain("WebView");
    expect(screen).not.toContain("direct_message");
    expect(screen).not.toContain("comment");
  });

  it("is reachable from the Me tab", () => {
    expect(read("mobile/app/_layout.tsx")).toContain('name="alerts"');
    expect(read("mobile/app/(tabs)/me.tsx")).toContain('router.push("/alerts")');
  });
});

describe("alert href destinations", () => {
  it("opens a public event path in-app", () => {
    expect(inAppEventPath("/event/spring-open")).toBe("/event/spring-open");
    expect(inAppEventPath("/event/spring-open?from=alerts")).toBe(
      "/event/spring-open"
    );
    expect(inAppEventPath("/event/spring-open#details")).toBe(
      "/event/spring-open"
    );
  });

  it("keeps family, orgs, account, and nested event pages on the website", () => {
    const websiteOnly = [
      "/family",
      "/family#needs-response",
      "/orgs",
      "/orgs/lincoln",
      "/orgs/lincoln/people",
      "/account",
      "/account#signin",
      "/event/spring-open/manage",
      "/event/spring-open/edit",
    ];
    for (const href of websiteOnly) {
      expect(inAppEventPath(href)).toBeNull();
      expect(isWebsiteOnlyHref(href)).toBe(true);
    }
  });

  it("opens website-only hrefs in Safari on causey.dev, never arbitrary hosts", () => {
    expect(websiteHrefToOpen("/family", "https://causey.dev")).toBe(
      "https://causey.dev/family"
    );
    expect(websiteHrefToOpen("/orgs/lincoln", "https://causey.dev")).toBe(
      "https://causey.dev/orgs/lincoln"
    );
    expect(
      websiteHrefToOpen("https://causey.dev/account#data", "https://causey.dev")
    ).toBe("https://causey.dev/account#data");
    expect(
      websiteHrefToOpen("https://evil.example/family", "https://causey.dev")
    ).toBeNull();
    expect(websiteHrefToOpen("/event/spring-open", "https://causey.dev")).toBeNull();
  });

  it("does not invent an in-app destination for a missing href", () => {
    expect(inAppEventPath(null)).toBeNull();
    expect(isWebsiteOnlyHref(null)).toBe(false);
    expect(inAppEventPath("/me")).toBeNull();
    expect(isWebsiteOnlyHref("/me")).toBe(false);
  });

  it("shows a relative time, then an ISO date", () => {
    const now = Date.parse("2026-09-05T18:00:00.000Z");
    expect(formatAlertTime("2026-09-05T17:50:00.000Z", now)).toBe("10 min ago");
    expect(formatAlertTime("2026-08-01T12:00:00.000Z", now)).toBe("2026-08-01");
  });
});
