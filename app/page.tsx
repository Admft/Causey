import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeCoveragePath } from "@/components/HomeCoveragePath";
import { HomeDistrictPitch } from "@/components/HomeDistrictPitch";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";
import { getCurrentProfile } from "@/lib/auth/session";
import { parseDiscoveryCategory } from "@/lib/category-discovery";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Causey indexes official scholastic competition listings across chess, speech and debate, STEM, arts, and writing so students can find events within reach. Coverage varies by category and is still incomplete.",
};

const HERO_CHIP =
  "inline-flex items-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red";

export default async function CompetitionTypesPage() {
  // Signed-in visitors may start from their saved directory shortcut; a
  // schema gap or signed-out visit simply means no preselected category.
  const profile = await getCurrentProfile();
  const initialCategory = parseDiscoveryCategory(
    profile?.preferred_competition_category
  );

  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="home-hero-lockup relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
          <div className="home-hero-copy relative z-10">
            <div className="flex min-w-0 flex-col">
              <div className="animate-rise" data-hero-brand>
                <CauseyLogo size="hero" />
              </div>
              <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[16ch] font-display text-display-xl tracking-tight text-foreground sm:mt-6">
                Student competitions, indexed in one place.
              </h1>
              <p className="animate-rise animate-rise-delay-1 mt-3 max-w-prose text-md text-muted sm:mt-4">
                Search chess, speech and debate, STEM, arts, and writing events by
                zip to see what is actually within reach. Coverage varies sharply
                by category; chess is the broadest directory today, and every
                directory is still incomplete.
              </p>
              <div className="animate-rise animate-rise-delay-2 mt-6 flex flex-wrap gap-2">
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
            <HomeHeroSearch initialCategory={initialCategory} />
          </div>
        </div>
      </section>

      <HomeCoveragePath />

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
