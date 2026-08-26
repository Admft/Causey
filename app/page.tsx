import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeCoveragePath } from "@/components/HomeCoveragePath";
import { HomeDistrictPitch } from "@/components/HomeDistrictPitch";
import { HomeHeroCard } from "@/components/HomeHeroCard";
import { HomeHeroNext } from "@/components/HomeHeroNext";
import { getCurrentProfile } from "@/lib/auth/session";
import { parseDiscoveryCategory } from "@/lib/category-discovery";
import { getHomeMyTournaments } from "@/lib/data/home-my-tournaments";
import { isHomeMyTournamentsView } from "@/lib/home-my-tournaments";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Causey indexes official scholastic competition listings across chess, speech and debate, STEM, arts, and writing so students can find events within reach. Coverage varies by category and is still incomplete.",
};

const HERO_CHIP =
  "inline-flex items-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red";

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
  const myTournaments = profile
    ? await getHomeMyTournaments(profile)
    : null;

  return (
    <>
      <section className="home-hero access-grid">
        <div className="home-hero-lockup relative mx-auto max-w-6xl px-5 sm:px-8">
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
              initialTab={isHomeMyTournamentsView(view) ? "mine" : "find"}
              summary={myTournaments}
            />
            <p className="home-hero-org-links mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm md:hidden">
              <Link
                href="/clubs"
                className="font-semibold text-muted-strong transition-colors hover:text-brand-red"
              >
                Run a club or team
              </Link>
              <Link
                href="/districts"
                className="font-semibold text-muted-strong transition-colors hover:text-brand-red"
              >
                Chess for a district
              </Link>
            </p>
          </div>
        </div>
        <HomeHeroNext targetId="coverage" />
      </section>

      <HomeCoveragePath />

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
