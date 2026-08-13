import type { Metadata } from "next";
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
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 py-12 sm:gap-10 sm:px-8 sm:py-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,20rem)] md:items-center md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,24rem)] lg:gap-14 lg:py-20">
          <div className="relative z-10 min-w-0">
            <div className="animate-rise" data-home-hero-brand>
              <CauseyLogo size="hero" />
            </div>
            <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[18ch] font-display text-display-xl font-bold tracking-tight text-foreground sm:mt-6">
              Student competitions, indexed in one place.
            </h1>
            <p className="animate-rise animate-rise-delay-1 mt-3 max-w-prose text-md text-muted sm:mt-4">
              Search chess, speech and debate, STEM, arts, and writing events by
              zip to see what is actually within reach. Coverage varies sharply
              by category; chess is the broadest directory today, and every
              directory is still incomplete.
            </p>
          </div>
          <div className="animate-rise animate-rise-delay-2 relative z-10 min-w-0 w-full">
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
