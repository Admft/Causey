import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
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
      <section className="access-grid">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:gap-16">
          <div className="relative z-10">
            <div className="animate-rise">
              <CauseyLogo size="hero" />
            </div>
            <h1 className="animate-rise animate-rise-delay-1 mt-6 max-w-[18ch] font-display text-display-xl font-bold tracking-tight text-foreground">
              Scholastic chess tournaments, indexed in one place.
            </h1>
            <p className="animate-rise animate-rise-delay-1 mt-4 max-w-prose text-md text-muted">
              Search by zip to see what is actually within reach. Chess is the
              first competition type we have finished; four more are in progress
              below.
            </p>
          </div>
          <div className="animate-rise animate-rise-delay-2 relative z-10">
            <HomeHeroSearch />
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <h2 className="font-display text-display font-bold tracking-tight text-foreground">
            What Causey covers
          </h2>
          <p className="mt-2 max-w-prose text-base text-muted">
            Every type below is on the roadmap. Only chess has real listings
            behind it today.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Link
              href="/chess"
              className="card-lift group rounded-2xl border border-brand-red/30 bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                    Chess first
                  </p>
                  <h3 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                    Chess
                  </h3>
                </div>
                <span
                  aria-hidden="true"
                  className="nudge-x text-xl text-brand-red"
                >
                  →
                </span>
              </div>
              <p className="mt-3 max-w-md text-base text-muted">
                Find scholastic tournaments near you and trace qualification
                pathways from local events to national invitationals.
              </p>
              <span className="mt-6 inline-flex text-sm font-semibold text-brand-red">
                Explore chess competitions
              </span>
            </Link>

            {upcomingCompetitionTypes.map((type) => (
              <div
                key={type.name}
                className="rounded-2xl border border-line bg-surface-soft p-6"
                aria-disabled="true"
              >
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                  Not built yet
                </p>
                <h3 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                  {type.name}
                </h3>
                <p className="mt-3 max-w-md text-base text-muted">
                  {type.description}
                </p>
                <span className="mt-6 inline-flex text-sm font-semibold text-muted">
                  Not available yet
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TournamentSources />

      <HomeAccountPitch />
    </>
  );
}
