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
const heroCard = read("components/HomeHeroCard.tsx");
const heroMine = read("components/HomeHeroMyTournaments.tsx");
const coveragePath = read("components/HomeCoveragePath.tsx");
const authNav = read("components/AuthNav.tsx");
const siteHeader = read("components/SiteHeader.tsx");
const profileEditor = read("components/ProfileEditor.tsx");
const signupForm = read("components/SignupForm.tsx");
const searchClient = read("components/SearchClient.tsx");
const layout = read("app/layout.tsx");
const eventPage = read("app/event/[slug]/page.tsx");
const ratingActions = read("components/AccountCompetitionActions.tsx");
const homeAccountPitch = read("components/HomeAccountPitch.tsx");
const adminTournaments = read("app/admin/tournaments/page.tsx");

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
      "initialCategory={initialCategory}"
    );
    expect(homePage).toContain("<HomeHeroCard");
  });

  it("keeps a compact search card beside the copy on desktop", () => {
    expect(homePage).toContain("home-hero-lockup");
    expect(homePage).toContain("home-hero-copy");
    expect(homePage).toContain("home-hero-search-col");
    expect(heroCard).toContain("home-hero-search");
    expect(heroCard).toContain("md:rounded-3xl");
  });

  it("fills the remaining viewport on desktop and scrolls into the listing preview", () => {
    const globals = read("app/globals.css");
    const cue = read("components/HomeHeroNext.tsx");
    expect(homePage).toContain("home-hero access-grid");
    expect(homePage).toContain("md:min-h-[calc(100dvh-var(--home-hero-chrome))]");
    expect(homePage).toContain('targetId={featured.results.length > 0 ? "featured" : "coverage"}');
    expect(homePage).toContain("Browse tournaments");
    expect(coveragePath).toContain('id="coverage"');
    expect(globals).toContain("@keyframes home-hero-cue-bob");
    expect(globals).toContain("#featured");
    expect(cue).toContain("{label}");
    expect(cue).toContain("max-md:hidden");
    expect(cue).toContain("scrollIntoView");
    expect(cue).toContain("prefers-reduced-motion");
  });

  it("offers club and district as chips and still sheens #search", () => {
    expect(homePage).not.toContain("Find a tournament");
    expect(homePage).toContain("Run a club or team");
    expect(homePage).toContain("Chess for a district");
    expect(homePage).toContain('href="/clubs"');
    expect(homePage).toContain('href="/districts"');
    expect(heroCard).toContain('id="search"');
    expect(heroCard).toContain("is-search-attention");
    expect(heroCard).toContain("scrollIntoView");
    expect(heroCard).toContain("(max-width: 47.999rem)");
    expect(read("app/globals.css")).toContain("@keyframes search-shine");
    expect(read("app/globals.css")).toContain("@keyframes search-attention");
  });

  it("simplifies the stacked homepage so search is the first job", () => {
    expect(homePage).toContain("Pick a type, then search by zip.");
    expect(homePage).toContain("hidden flex-wrap gap-2 md:flex");
    expect(homePage).toContain(
      "home-hero-org-links mt-3 grid grid-cols-2 gap-2 md:hidden"
    );
    expect(homePage).toContain("bg-brand-blue-soft");
    expect(homePage).toContain("HERO_ORG_CHIP");
    expect(homePage).toContain("max-w-[20ch]");
    expect(heroCard).toContain("rounded-2xl");
    expect(heroCard).toContain("md:rounded-3xl");
    expect(heroCard).toContain("shadow-[var(--shadow-panel)]");
    expect(heroSearch).toContain("grid grid-cols-6 gap-2 md:grid-cols-5");
    expect(heroSearch).toContain("col-span-2 col-start-2 md:col-span-1 md:col-start-auto");
    expect(heroSearch).toContain("{option.shortLabel}");
    expect(heroSearch).toContain('placeholder="Optional"');
    expect(heroSearch).toContain("md:grid-cols-2");
    expect(heroSearch).toContain("max-md:hidden");
    expect(read("app/globals.css")).not.toContain("max-w-[18rem]");
  });

  it("offers a My tournaments tab that returns after sign-in", () => {
    expect(heroCard).toContain("My tournaments");
    expect(heroCard).toContain('HOME_MY_TOURNAMENTS_PATH');
    expect(heroMine).toContain("HOME_MY_TOURNAMENTS_LOGIN_HREF");
    expect(heroMine).toContain("Create an account");
    expect(heroMine).toContain("onSearchInstead");
    expect(heroMine).not.toMatch(/registered/i);
    expect(homePage).toContain("isHomeMyTournamentsView");
    expect(homePage).toContain("getHomeMyTournaments");
  });

  it("shows desktop featured listings and a zip capture path", () => {
    expect(homePage).toContain("HomeFeaturedSection");
    expect(homePage).toContain("MissingZipCard");
    expect(homePage).toContain('initialZip={profile?.zip ?? ""}');
    expect(heroSearch).toContain("Use my location");
    expect(heroSearch).toContain("requestNearestZip");
    expect(eventPage).toContain("CompetitionComments");
    expect(signupForm).toContain("ZipCaptureField");
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
    expect(heroSearch).toContain('role="radiogroup"');
    expect(heroSearch).toContain("CategoryGlyph");
    expect(heroSearch).not.toContain("<option value=\"\">Choose a competition type</option>");
    expect(heroSearch).toContain("discoveryCategoryHref(");
    expect(heroSearch).toContain("Search tournaments");
    expect(heroSearch).toContain("optionally narrow by zip and distance");
    expect(heroSearch).not.toContain("search by name or zip");
  });

  it("offers browse-without-zip only when the zip field is empty", () => {
    expect(heroSearch).toContain("Browse {discoveryCategoryLabel(category)} without a zip");
    expect(heroSearch).toContain("category && !zipTrimmed");
    expect(heroSearch).toContain("CategoryGlyph");
  });
});

describe("event difficulty rating layout", () => {
  it("places 1–10 in two rows of five", () => {
    expect(ratingActions).toContain("grid w-full grid-cols-5 gap-1");
    expect(ratingActions).not.toContain("flex flex-wrap gap-1");
    expect(eventPage).toContain("DifficultyRating");
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

  it("recovers to signed-out navigation when the auth lookup rejects", () => {
    expect(authNav).toContain(".catch(() =>");
    expect(authNav).toContain("setEmail(null)");
    expect(authNav).toContain("request !== accessRequest");
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

  it("fails the whole save without exposing schema internals", () => {
    expect(profileEditor).toContain("SHORTCUT_SCHEMA_GAP_MESSAGE");
    expect(profileEditor).toContain('message.includes("preferred_competition_category")');
    expect(profileEditor).not.toContain("migration 0056");
    expect(profileEditor).toContain("Your other profile changes were not saved");
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
    expect(coveragePath).toContain("LIVE_SOURCES");
    expect(coveragePath).toContain("CategoryGlyph");
    expect(coveragePath).toContain("Five directories, one honest map");
    expect(coveragePath).toContain("link-only");
    expect(coveragePath).toContain("referenceSources");
    expect(coveragePath).not.toContain("use client");
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
    const stem = DISCOVERY_CATEGORIES.find((category) => category.id === "stem")!;
    expect(stem.activeSources.map((source) => source.name)).not.toContain(
      "U.S. Department of Energy National Science Bowl"
    );
    expect(stem.referenceSources.map((source) => source.name)).toContain(
      "U.S. Department of Energy National Science Bowl"
    );
    const writing = DISCOVERY_CATEGORIES.find(
      (category) => category.id === "writing"
    )!;
    expect(writing.emptyDescription).toContain("Timing to All");
    expect(writing.activeSources.map((source) => source.name)).toContain(
      "AFSA National High School Essay Contest"
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
    expect(eventPage).toContain("PageBackLink");
    expect(eventPage).not.toContain("←");
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
    expect(adminTournaments).not.toContain("In chess search");
    expect(adminTournaments).not.toContain("enter chess search");
  });

  it("sends no-preference role actions to the homepage chooser", () => {
    expect(homeAccountPitch).toContain(': "/#search"');
    expect(read("app/me/page.tsx")).toContain(': "/#search"');
    expect(read("app/family/page.tsx")).toContain(': "/#search"');
  });

  it("requires every search surface to name its category", () => {
    expect(searchClient).toContain("category: DiscoveryCategory");
    expect(searchClient).not.toContain('category = "chess"');
    expect(read("app/chess/page.tsx")).toContain(
      'category="chess"'
    );
  });

  it("returns directory search to the homepage type chooser", () => {
    expect(searchClient).toContain("PageBackLink");
    expect(read("components/PageBackLink.tsx")).toContain('href = "/"');
    expect(read("components/PageBackLink.tsx")).toContain(
      "All competition types"
    );
    expect(read("components/PageBackLink.tsx")).toContain('className="page-back"');
    expect(read("components/PageBackLink.tsx")).not.toContain("←");
  });

  it("puts category discipline chips on search instead of burying them in the rail", () => {
    expect(searchClient).toContain("DisciplineFacetSwitch");
    expect(read("components/SearchFilters.tsx")).toContain(
      "primaryFacetsForCategory(category).length === 0"
    );
    expect(read("components/CompetitionCard.tsx")).toContain(
      "formatCompetitionFacetLabel"
    );
  });
});
