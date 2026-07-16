import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-semibold text-brand-red">Competition discovery</p>
          <h1 className="mt-2 max-w-[16ch] font-display text-display-xl font-bold tracking-tight text-foreground">
            What do you want to compete in?
          </h1>
          <p className="mt-4 max-w-xl text-md text-muted">
            Choose a competition type to see opportunities, eligibility, costs,
            and the paths they can open.
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Link
              href="/chess"
              className="card-lift group rounded-2xl border border-brand-red/30 bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                    Available now
                  </p>
                  <h2 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                    Chess
                  </h2>
                </div>
                <span
                  aria-hidden="true"
                  className="text-xl text-brand-red transition-transform group-hover:translate-x-1"
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
                  Coming soon
                </p>
                <h2 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                  {type.name}
                </h2>
                <p className="mt-3 max-w-md text-base text-muted">{type.description}</p>
                <span className="mt-6 inline-flex text-sm font-semibold text-muted">
                  Not available yet
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TournamentSources />
    </>
  );
}
