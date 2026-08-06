import type { Metadata } from "next";
import Link from "next/link";
import { HomeAccountPitch } from "@/components/HomeAccountPitch";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";
import { TournamentSources } from "@/components/TournamentSources";

export const metadata: Metadata = {
  title: "Find student competitions",
  description:
    "Choose a competition type and find opportunities that match your interests, eligibility, and location.",
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
            <h1 className="animate-rise max-w-[15ch] font-display text-display-xl font-bold tracking-tight text-foreground">
              Start local. See where it leads.
            </h1>
            <p className="animate-rise animate-rise-delay-1 mt-4 max-w-prose text-md text-muted">
              Scholastic chess tournaments across the US, indexed in one place.
              Search by zip to see what is actually within reach.
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
            Chess has real listings behind it today. Four more competition
            types are in progress.
          </p>

          {/* Chess is the one working surface, so it gets the one big panel;
              the unbuilt types are a plain list — nothing to click yet, so
              no cards. */}
          <Link
            href="/chess"
            className="card-lift group mt-8 block rounded-2xl border border-brand-red/30 bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                  Searchable today
                </p>
                <h3 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                  Chess
                </h3>
                <p className="mt-3 max-w-xl text-base text-muted">
                  Find scholastic tournaments near you and trace qualification
                  pathways from local events to national invitationals.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-base font-semibold text-brand-red">
                Search chess tournaments
                <span aria-hidden="true" className="nudge-x">
                  →
                </span>
              </span>
            </div>
          </Link>

          <div className="mt-10">
            <h3 className="text-xs font-semibold text-muted-strong">
              In progress
            </h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {upcomingCompetitionTypes.map((type) => (
                <div key={type.name}>
                  <dt className="text-base font-semibold text-foreground">
                    {type.name}
                  </dt>
                  <dd className="mt-1 text-sm text-muted">{type.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <TournamentSources />

      <HomeAccountPitch />
    </>
  );
}
