import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectHomeScreenKind,
  homeScreenBrowserGate,
  homeScreenPromptCopy,
  homeScreenTutorial,
  isStandaloneDisplay,
  shouldOfferAddToHomeScreen,
} from "@/lib/add-to-home-screen";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("add to Home Screen targeting", () => {
  it("tells iPhone, iPad, and Android apart, including iPadOS desktop UA", () => {
    expect(
      detectHomeScreenKind(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "iPhone",
        5
      )
    ).toBe("iphone");
    expect(
      detectHomeScreenKind(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
        "iPad",
        5
      )
    ).toBe("ipad");
    expect(
      detectHomeScreenKind(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "MacIntel",
        5
      )
    ).toBe("ipad");
    expect(
      detectHomeScreenKind(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "MacIntel",
        0
      )
    ).toBe("desktop");
    expect(
      detectHomeScreenKind(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile",
        "Linux armv8l",
        5
      )
    ).toBe("android");
  });

  it("hides the offer in standalone and on desktop browsers", () => {
    expect(
      shouldOfferAddToHomeScreen({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
        standalone: true,
      })
    ).toBe(false);
    expect(
      shouldOfferAddToHomeScreen({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 0,
        standalone: false,
      })
    ).toBe(false);
    expect(
      shouldOfferAddToHomeScreen({
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
        standalone: false,
      })
    ).toBe(true);
    expect(isStandaloneDisplay(true, false)).toBe(true);
    expect(isStandaloneDisplay(false, true)).toBe(true);
  });

  it("sends iOS Chrome to Safari and in-app browsers to a real browser", () => {
    expect(
      homeScreenBrowserGate(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0",
        "iphone"
      )
    ).toBe("use-safari");
    expect(
      homeScreenBrowserGate(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram",
        "iphone"
      )
    ).toBe("use-browser");
    expect(
      homeScreenBrowserGate(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari",
        "iphone"
      )
    ).toBe("ok");
  });

  it("walks Safari Share on Apple and the Chrome menu on Android", () => {
    const iphone = homeScreenTutorial("iphone", "ok");
    expect(iphone.lead).toContain("Safari");
    expect(iphone.steps[0]?.body).toContain("bottom of Safari");
    expect(iphone.steps[1]?.title).toBe("Add to Home Screen");
    expect(iphone.note).toContain("not a separate App Store or Play listing");

    const ipad = homeScreenTutorial("ipad", "ok");
    expect(ipad.steps[0]?.body).toContain("top bar");

    const android = homeScreenTutorial("android", "ok");
    expect(android.steps[0]?.body).toContain("three dots");
    expect(android.steps[1]?.body).toMatch(/Add to Home screen|Install app/);

    const safariGate = homeScreenTutorial("iphone", "use-safari");
    expect(safariGate.lead).toContain("not Chrome or Firefox");
    expect(safariGate.steps[0]?.title).toBe("Open in Safari");

    expect(homeScreenPromptCopy("android").action).toBe("Add to Home Screen");
    expect(homeScreenPromptCopy("iphone").body).toContain("Share");
  });
});

describe("add to Home Screen surfaces", () => {
  it("installs from a footer button or the signed-in More menu", () => {
    const layout = read("app/layout.tsx");
    const nav = read("components/AuthNav.tsx");
    const panel = read("components/AddToHomeScreen.tsx");
    expect(layout).toContain("AddToHomeScreen");
    expect(layout).not.toContain("EarlyBuildBanner");
    expect(nav).toContain("Add to Home Screen");
    expect(nav).toContain("requestAddToHomeScreen");
    expect(panel).toContain("beforeinstallprompt");
    expect(panel).toContain("showModal");
    expect(panel).not.toContain("Download the app");
    expect(panel).not.toContain("App Store");
  });

  it("publishes PNG icons Android needs to offer an install prompt", () => {
    const manifest = read("app/manifest.ts");
    expect(manifest).toContain('sizes: "192x192"');
    expect(manifest).toContain('sizes: "512x512"');
    expect(manifest).toContain('display: "standalone"');
    expect(read("app/icon-192/route.tsx")).toContain("causeyAppIcon(192)");
    expect(read("app/icon-512/route.tsx")).toContain("causeyAppIcon(512)");
    expect(read("app/layout.tsx")).toContain("appleWebApp");
    expect(read("app/layout.tsx")).toContain('themeColor: "#f5f9fc"');
    expect(read("app/layout.tsx")).toContain("apple-mobile-web-app-capable");
  });
});
