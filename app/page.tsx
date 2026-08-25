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

const HERO_PATHS = [
  {
    href: "#search",
    title: "Find a tournament",
    description: "Search by type and zip. Chess is the densest directory today.",
  },
  {
    href: "/clubs",
    title: "Run a club or team",
    description: "Roster, travel, attendance, and recorded results in one season file.",
  },
  {
    href: "/districts",
    title: "Chess for a district",
    description: "Assisted school setup, family follow-through, and school-level totals.",
  },
] as const;

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
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[minmax(0,1.05fr)_minmax(0,24rem)] md:gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,26rem)] lg:gap-12 lg:py-12">
          <div className="relative z-10 flex min-w-0 flex-col">
            <div className="animate-rise" data-home-hero-brand>
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
            <ul className="animate-rise animate-rise-delay-2 mt-6 divide-y divide-line border-y border-line">
              {HERO_PATHS.map((path) => (
                <li key={path.href}>
                  <Link
                    href={path.href}
                    className="group flex items-start justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground group-hover:text-brand-red">
                        {path.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {path.description}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="nudge-x shrink-0 text-lg font-bold text-brand-red"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-rise animate-rise-delay-2 relative z-10 flex min-w-0 w-full md:items-stretch">
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
