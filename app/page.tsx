import type { Metadata } from "next";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeDistrictPitch } from "@/components/HomeDistrictPitch";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";
import { TournamentSources } from "@/components/TournamentSources";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Causey indexes scholastic chess tournaments across the US so students can find events within reach.",
};

const upcomingCompetitionTypes = [
  {
    name: "STEM",
    description: "Science, technology, engineering, and mathematics competitions.",
  },
  {
    name: "Debate",
    description: "Speech, debate, and public-speaking competitions.",
  },
  {
    name: "Arts",
    description: "Visual, performing, and creative arts competitions.",
  },
  {
    name: "Writing",
    description: "Essay, journalism, poetry, and creative writing competitions.",
  },
];

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

      <TournamentSources />

      <section
        className="home-band band-join band-join--surface bg-surface"
        aria-labelledby="roadmap-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2
            id="roadmap-heading"
            className="max-w-[22ch] font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Four more competition types are in progress
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted">
            None have searchable listings yet; chess is the only type with real
            data behind it today.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-x-10 border-b border-line sm:grid-cols-2">
            {upcomingCompetitionTypes.map((type) => (
              <li key={type.name} className="border-t border-line py-3">
                <p className="font-semibold text-foreground">{type.name}</p>
                <p className="mt-1 text-sm text-muted">{type.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
