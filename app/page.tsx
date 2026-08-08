import type { Metadata } from "next";
import Link from "next/link";
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

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 sm:px-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="min-w-0">
            <h2 className="font-display text-display font-bold tracking-tight text-foreground">
              Chess is ready to search
            </h2>
            <p className="mt-2 max-w-prose text-base text-muted">
              Only chess has real listings behind it today — and those listings
              are still being filled in.
            </p>
            <Link
              href="/chess"
              className="card-lift group mt-6 flex items-start justify-between gap-4 rounded-2xl border border-brand-red/30 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <div className="min-w-0">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                  Chess
                </p>
                <h3 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                  Chess tournaments
                </h3>
                <p className="mt-3 text-base text-muted">
                  Find indexed scholastic events near a zip code, with fees and
                  section eligibility up front.
                </p>
                <span className="mt-5 inline-flex text-sm font-semibold text-brand-red">
                  Search chess tournaments
                </span>
              </div>
              <span
                aria-hidden="true"
                className="nudge-x shrink-0 text-xl text-brand-red"
              >
                →
              </span>
            </Link>
          </div>

          <div className="min-w-0 md:border-l md:border-line md:pl-12 lg:pl-16">
            <h3 className="text-sm font-semibold text-foreground">
              Also on the roadmap
            </h3>
            <p className="mt-2 text-sm text-muted">
              These competition types are planned. None have searchable listings
              yet.
            </p>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {upcomingCompetitionTypes.map((type) => (
                <li key={type.name} className="py-3">
                  <p className="font-semibold text-foreground">{type.name}</p>
                  <p className="mt-1 text-sm text-muted">{type.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TournamentSources />

      <HomeDistrictPitch />

      <HomeAccountPitch />
    </>
  );
}
