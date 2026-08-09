import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * The district band answers two plain questions in order: what does Causey do
 * for a school's chess program, and how would a district actually start. Roles
 * come first because "who does what" is the fastest way to understand the
 * product. Setup is prose, not a second numbered strip, so the band does not
 * repeat the coverage path directly above it.
 */
const PROGRAM_WORK = [
  {
    role: "Coaches",
    detail:
      "Post a tournament to the team, see who can go, and mark who showed up.",
  },
  {
    role: "Parents and students",
    detail:
      "One page with the events coming up and anything still waiting on a parent's approval.",
  },
  {
    role: "The district office",
    detail:
      "How many students competed at each school, without reading individual student records.",
  },
];

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="district-pitch-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          Schools and districts
        </p>
        <h2
          id="district-pitch-heading"
          className="mt-2 max-w-[20ch] font-display text-display font-bold tracking-tight text-foreground"
        >
          Finding the tournament is the easy part.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Once a school runs a chess program, someone still has to tell families
          about each event, collect the permission, take attendance, and answer
          the district at the end of the season. That is the work Causey is
          building, and it is what a pilot puts in place.
        </p>

        <dl className="mt-8 divide-y divide-line border-y border-line">
          {PROGRAM_WORK.map((entry) => (
            <div
              key={entry.role}
              className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-8 sm:py-5"
            >
              <dt className="text-sm font-semibold text-foreground">
                {entry.role}
              </dt>
              <dd className="max-w-prose text-sm text-muted sm:text-base">
                {entry.detail}
              </dd>
            </div>
          ))}
        </dl>

        <ScrollReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-8">
            <h3 className="font-display text-xl font-bold text-foreground">
              How a district starts
            </h3>
            <div className="min-w-0">
              <p className="max-w-prose text-base text-muted">
                There is no district signup button. We talk first and agree on
                terms, then Causey creates the district, verifies each school,
                and hands every school to the administrator the district names.
                Causey does not list a school, a coach, or a student before that
                agreement is signed.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href="/districts" className="cta-enabled inline-flex">
                  See how the pilot works
                </Link>
                <a
                  href={FOUNDING_TEAM_MEETING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Book a conversation with the Causey founding team in a new tab"
                  className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Talk with the founding team{" "}
                  <span aria-hidden="true" className="nudge-x">
                    ↗
                  </span>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
