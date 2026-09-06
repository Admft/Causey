import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeCoveragePath } from "@/components/HomeCoveragePath";
import { HomeDistrictPitch } from "@/components/HomeDistrictPitch";
import { HomeFeaturedSection } from "@/components/HomeFeaturedSection";
import { HomeHeroCard } from "@/components/HomeHeroCard";
import { HomeHeroNext } from "@/components/HomeHeroNext";
import { MissingZipCard } from "@/components/MissingZipCard";
import { getCurrentProfile } from "@/lib/auth/session";
import { parseDiscoveryCategory } from "@/lib/category-discovery";
import { getHomeFeaturedCompetitions } from "@/lib/data/home-featured";
import { getHomeMyTournaments } from "@/lib/data/home-my-tournaments";
import { isHomeMyTournamentsView } from "@/lib/home-my-tournaments";

// Reads the signed-in account, so this response is never shareable.
// Declared rather than inferred from cookies(): the day someone moves the
// session read out of this file, the caching contract should not move too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Causey indexes official scholastic competition listings across chess, speech and debate, STEM, arts, and writing so students can find events within reach. Coverage varies by category and is still incomplete.",
};

const HERO_CHIP =
  "inline-flex items-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red";

const HERO_ORG_CHIP =
  "flex h-full min-h-12 items-center justify-center rounded-2xl border border-brand-blue/45 bg-brand-blue-soft px-3 py-2.5 text-center text-sm font-bold leading-tight text-brand-blue-strong transition-colors hover:border-brand-blue-strong";

export default async function CompetitionTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // Signed-in visitors may start from their saved directory shortcut; a
  // schema gap or signed-out visit simply means no preselected category.
  const [{ view }, profile] = await Promise.all([
    searchParams,
    getCurrentProfile(),
  ]);
  const initialCategory = parseDiscoveryCategory(
    profile?.preferred_competition_category
  );
  const [myTournaments, featured] = await Promise.all([
    profile ? getHomeMyTournaments(profile) : Promise.resolve(null),
    getHomeFeaturedCompetitions(profile?.zip ?? null),
  ]);

  return (
    <>
      <section className="home-hero access-grid relative flex flex-col md:min-h-[calc(100dvh-var(--home-hero-chrome))]">
        <div className="home-hero-lockup relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8 md:flex-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] md:items-center md:gap-x-10 md:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-x-12">
          <div className="home-hero-copy relative z-10">
            <div className="flex min-w-0 flex-col">
              <div className="animate-rise" data-hero-brand>
                <span className="md:hidden">
                  <CauseyLogo size="md" />
                </span>
                <span className="hidden md:inline-flex">
                  <CauseyLogo size="hero" />
                </span>
              </div>
              <h1 className="animate-rise animate-rise-delay-1 mt-2 max-w-[20ch] text-balance font-display text-display tracking-tight text-foreground md:mt-6 md:max-w-[16ch] md:text-display-xl">
                Student competitions, indexed in one place.
              </h1>
              <p className="animate-rise animate-rise-delay-1 mt-2 text-sm text-muted md:hidden">
                Pick a type, then search by zip.
              </p>
              <p className="animate-rise animate-rise-delay-1 mt-4 hidden max-w-prose text-md text-muted md:block">
                Search chess, speech and debate, STEM, arts, and writing events by
                zip to see what is actually within reach. Coverage varies sharply
                by category; chess is the broadest directory today, and every
                directory is still incomplete.
              </p>
              <div className="animate-rise animate-rise-delay-2 mt-6 hidden flex-wrap gap-2 md:flex">
                <Link href="/clubs" className={HERO_CHIP}>
                  Run a club or team
                </Link>
                <Link href="/districts" className={HERO_CHIP}>
                  Chess for a district
                </Link>
              </div>
            </div>
          </div>
          <div className="home-hero-search-col relative z-10">
            <HomeHeroCard
              initialCategory={initialCategory}
              initialZip={profile?.zip ?? ""}
              initialTab={isHomeMyTournamentsView(view) ? "mine" : "find"}
              summary={myTournaments}
            />
            <nav
              aria-label="Club and district"
              className="home-hero-org-links mt-3 grid grid-cols-2 gap-2 md:hidden"
            >
              <Link href="/clubs" className={HERO_ORG_CHIP}>
                Run a club or team
              </Link>
              <Link href="/districts" className={HERO_ORG_CHIP}>
                Chess for a district
              </Link>
            </nav>
          </div>
        </div>
        <HomeHeroNext
          targetId={featured.results.length > 0 ? "featured" : "coverage"}
          label={
            featured.results.length > 0
              ? "Browse tournaments"
              : "Coverage today"
          }
        />
      </section>

      {profile && !profile.zip ? (
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <MissingZipCard />
        </div>
      ) : null}

      <HomeFeaturedSection featured={featured} zip={profile?.zip ?? null} />

      <HomeCoveragePath />

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
