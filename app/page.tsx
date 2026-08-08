import type { Metadata } from "next";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeCoveragePath } from "@/components/HomeCoveragePath";
import { HomeDistrictPitch } from "@/components/HomeDistrictPitch";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Causey indexes scholastic chess tournaments across the US so students can find events within reach.",
};

export default function CompetitionTypesPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 py-12 sm:gap-10 sm:px-8 sm:py-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,20rem)] md:items-center md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,24rem)] lg:gap-14 lg:py-20">
          <div className="relative z-10 min-w-0">
            <div className="animate-rise" data-home-hero-brand>
              <CauseyLogo size="hero" />
            </div>
            <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[18ch] font-display text-display-xl font-bold tracking-tight text-foreground sm:mt-6">
              Scholastic chess tournaments, indexed in one place.
            </h1>
            <p className="animate-rise animate-rise-delay-1 mt-3 max-w-prose text-md text-muted sm:mt-4">
              Search by zip to see what is actually within reach. Chess is the
              first competition type we have finished; four more are in progress
              below.
            </p>
          </div>
          <div className="animate-rise animate-rise-delay-2 relative z-10 min-w-0 w-full">
            <HomeHeroSearch />
          </div>
        </div>
      </section>

      <HomeCoveragePath />

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
