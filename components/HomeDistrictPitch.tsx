import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery. Not two stamped cards: the club season is a
 * printed scoresheet (athletic, self-serve); the district is a nested office
 * panel in the calm blue wash (assisted, not instant). Search owns the page
 * CTA, so these paths stay outline + text. Unfinished district work lives on
 * /districts.
 */
const CLUB_SEASON = [
  {
    title: "Roster",
    mark: "Join link",
    description: "A join link or a CSV. Groups for invites and the day-of list.",
  },
  {
    title: "Travel or host",
    mark: "Club is going",
    description: "Mark the club as going to a public event, or publish one here.",
  },
  {
    title: "Attendance",
    mark: "Day of",
    description: "Who showed up, including travel events the club attended.",
  },
  {
    title: "Results",
    mark: "Season CSV",
    description: "Place or award. Export when a board asks.",
  },
];

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--soft scroll-mt-20 bg-surface-soft"
      aria-labelledby="club-pitch-heading district-pitch-heading"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:items-start lg:gap-x-12">
        <ScrollReveal className="lg:col-span-7">
          <article>
            <p className="text-sm font-semibold text-brand-red">
              Clubs and teams
            </p>
            <h2
              id="club-pitch-heading"
              className="mt-3 max-w-[14ch] font-display text-display-lg tracking-tight text-foreground"
            >
              Run a season from roster to results.
            </h2>
            <p className="mt-4 max-w-prose text-sm text-muted">
              Create a club or team yourself. Invite the roster, mark who is
              going, take attendance, record how they finished.
            </p>

            <ol
              aria-label="Club season"
              className="mt-8 border-t-2 border-foreground"
            >
              {CLUB_SEASON.map((step, index) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-x-4 border-b border-line py-4 last:border-b-2 last:border-foreground sm:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem]"
                >
                  <span className="font-display text-2xl tabular-nums leading-none text-brand-red">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lead font-bold text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">{step.description}</p>
                  </div>
                  <p className="hidden pt-1 text-right text-xs font-bold tracking-wide text-muted-strong sm:block">
                    {step.mark}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              Causey is not pairings, dues, or a public club directory.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/clubs" className="cta-outline inline-flex">
                See the club workspace
              </Link>
              <Link
                href="/signup?role=coach"
                className="text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                Create a club account
              </Link>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="lg:col-span-5 lg:mt-20" delay={70}>
          <article className="rounded-3xl bg-brand-blue-soft px-5 py-6 sm:px-7 sm:py-8">
            <p className="text-sm font-semibold text-brand-blue-strong">
              School districts
            </p>
            <h2
              id="district-pitch-heading"
              className="mt-3 max-w-[16ch] font-display text-display-sm tracking-tight text-foreground"
            >
              Chess for a whole district, set up with you.
            </h2>
            <p className="mt-3 max-w-prose text-sm text-muted">
              There is no instant district signup. Causey provisions the
              district and its participating schools for an assisted chess pilot.
            </p>

            <div className="mt-6 border border-brand-blue/40 bg-white p-4">
              <p className="text-2xs font-semibold tracking-wide text-brand-blue-strong">
                District office
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                School-level totals. A calendar of school and district
                tournaments. Not a copy of any student’s browsing.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px bg-line">
                <div className="bg-white p-3">
                  <p className="text-sm font-bold text-foreground">
                    School tournament
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Coach runs the roster and the day.
                  </p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-sm font-bold text-foreground">
                    District-wide
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    One event, every connected school.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted">
              District staff, school staff, coaches, parents, and students each
              see the work meant for them.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/districts" className="cta-outline inline-flex">
                Review the district pilot
              </Link>
              <a
                href={FOUNDING_TEAM_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Book a conversation with the Causey founding team in a new tab"
                className="text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                Talk with the founding team{" "}
                <span aria-hidden="true" className="nudge-x">
                  ↗
                </span>
              </a>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
