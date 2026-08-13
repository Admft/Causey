import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DISCOVERY_CATEGORIES,
  discoveryCategoryHref,
  parseDiscoveryCategory,
  preferredDiscoveryHref,
} from "@/lib/category-discovery";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const homePage = read("app/page.tsx");
const heroSearch = read("components/HomeHeroSearch.tsx");
const coveragePath = read("components/HomeCoveragePath.tsx");
const authNav = read("components/AuthNav.tsx");
const siteHeader = read("components/SiteHeader.tsx");
const profileEditor = read("components/ProfileEditor.tsx");
const signupForm = read("components/SignupForm.tsx");
const searchClient = read("components/SearchClient.tsx");
const layout = read("app/layout.tsx");
const eventPage = read("app/event/[slug]/page.tsx");

describe("homepage leads with multi-category discovery", () => {
  it("names all five categories in metadata and copy without a chess hero", () => {
    expect(homePage).toContain("Student competitions, indexed in one place.");
    expect(homePage).toContain("Coverage varies sharply");
    expect(homePage).toContain(
      "chess, speech and debate, STEM, arts, and writing"
    );
    expect(homePage).not.toMatch(/<h1[^>]*>[^<]*[Cc]hess/);
  });

  it("passes the signed-in preferred category into the hero search", () => {
    expect(homePage).toContain("parseDiscoveryCategory(");
    expect(homePage).toContain(
      "<HomeHeroSearch initialCategory={initialCategory} />"
    );
  });
});

describe("hero search requires an explicit category", () => {
  it("starts signed-out visitors with no category selected", () => {
    expect(heroSearch).toContain("initialCategory = null");
    expect(heroSearch).toContain('initialCategory ?? ""');
    expect(heroSearch).not.toContain('initialCategory ?? "chess"');
  });

  it("validates category choice with an accessible error before routing", () => {
    expect(heroSearch).toContain("categoryError");
    expect(heroSearch).toContain('aria-describedby={categoryError ? "hero-category-error" : undefined}');
    expect(heroSearch).toContain('role="alert"');
    expect(heroSearch).toContain("discoveryCategoryHref(");
    expect(heroSearch).toContain("Search tournaments");
  });
});

describe("preferredDiscoveryHref", () => {
  it("routes a preference to that directory with supported params", () => {
    expect(preferredDiscoveryHref("debate", { zip: "75201" })).toBe(
      "/debate?zip=75201"
    );
    expect(discoveryCategoryHref("stem", { zip: "75201", radius: "25" })).toBe(
      "/stem?zip=75201&radius=25"
    );
  });

  it("falls back to the homepage chooser when no preference is set", () => {
    expect(preferredDiscoveryHref(null)).toBe("/");
    expect(preferredDiscoveryHref(null, { zip: "75201" })).toBe("/");
  });

  it("never treats an invalid stored value as a category", () => {
    expect(parseDiscoveryCategory("other")).toBeNull();
    expect(parseDiscoveryCategory("CHESS")).toBeNull();
    expect(parseDiscoveryCategory(42)).toBeNull();
  });
});

describe("navigation drops the unconditional chess shortcut", () => {
  it("renders no fixed category shortcut in the site header", () => {
    expect(siteHeader).not.toContain("PrimaryNav");
    expect(siteHeader).not.toContain('href="/chess"');
  });

  it("derives the single signed-in shortcut from the profile preference", () => {
    expect(authNav).toContain("preferred_competition_category");
    expect(authNav).toContain("parseDiscoveryCategory(");
    expect(authNav).toContain("shortLabel");
    // Chess pathways belong to the chess shortcut's active state.
    expect(authNav).toContain('pathname.startsWith("/pathways")');
    expect(authNav).not.toContain('href="/chess"');
  });
});

describe("account tournament shortcut setting", () => {
  it("offers None plus every discovery category, separate from interests", () => {
    expect(profileEditor).toContain("Tournament shortcut");
    expect(profileEditor).toContain("preferred_competition_category");
    expect(profileEditor).toContain("Competition interests");
    expect(profileEditor).toContain('option value=""');
    expect(profileEditor).toContain("None");
  });

  it("tells the truth when migration 0056 is missing", () => {
    expect(profileEditor).toContain("SHORTCUT_SCHEMA_GAP_MESSAGE");
    expect(profileEditor).toContain("migration 0056");
    expect(profileEditor).toContain('message.includes("preferred_competition_category")');
  });
});

describe("multi-category interests", () => {
  it("signup defaults to no selected interest and lists every category", () => {
    expect(signupForm).toContain("Competition interests (optional)");
    expect(signupForm).toContain("new Set()");
    expect(signupForm).not.toMatch(/checked\s*=\s*\{?\s*true/);
    expect(signupForm).not.toContain("Interested in chess");
    expect(signupForm).not.toContain("chessInterest");
  });

  it("profile editor keeps interests as a category set", () => {
    expect(profileEditor).toContain("Set<DiscoveryCategory>");
    expect(profileEditor).toContain("DISCOVERY_CATEGORIES.map");
  });
});

describe("coverage and empty states stay honest", () => {
  it("coverage panel indexes all five directories from shared metadata", () => {
    expect(coveragePath).toContain("DISCOVERY_CATEGORIES.map");
    expect(coveragePath).toContain("Indexed today");
    expect(coveragePath).toContain("Broadest coverage");
    expect(coveragePath).toContain("Limited coverage");
    expect(coveragePath).not.toContain("Coming soon");
    expect(coveragePath).not.toContain("Beta");
  });

  it("every category owns truthful empty-results copy used by search", () => {
    for (const category of DISCOVERY_CATEGORIES) {
      expect(category.emptyDescription.length).toBeGreaterThan(40);
    }
    expect(searchClient).toContain("categoryDefinition.emptyDescription");
    expect(searchClient).not.toContain(
      "only the limited official sources listed below"
    );
  });

  it("chess directories stay chess-specific and pathways is labeled chess", () => {
    const pathwaysPage = read("app/pathways/page.tsx");
    expect(pathwaysPage).toContain("Chess qualification pathways");
    const chessPage = read("app/chess/page.tsx");
    expect(chessPage).toContain("Scholastic chess competitions");
  });
});

describe("generalized links and return paths", () => {
  it("footer links to every discovery directory", () => {
    expect(layout).toContain("DISCOVERY_CATEGORIES.map");
  });

  it("public events return to their category directory, not /chess", () => {
    expect(eventPage).toContain("discoveryCategory(competition.category)");
    expect(eventPage).toContain("backToDirectory");
    expect(eventPage).toContain("categoryDefinition.href");
  });

  it("generic surfaces stop hardcoding /chess as the search destination", () => {
    for (const file of [
      "app/not-found.tsx",
      "app/orgs/page.tsx",
      "app/signup/page.tsx",
      "app/login/page.tsx",
      "app/join/[code]/page.tsx",
      "app/claim/[token]/page.tsx",
    ]) {
      expect(read(file)).not.toContain('href="/chess"');
    }
  });
});
