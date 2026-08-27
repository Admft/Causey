import Link from "next/link";
import { Fragment } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery. Each buyer gets a physical object, not a
 * feature list. The club season is a printed scoresheet: red margin rule
 * down the number column, a stamped field label per step, fine-print
 * colophon (athletic, self-serve). The district is an office report in the
 * calm blue wash: aggregate stamp on the header, a schematic calendar of
 * school and district tournaments (assisted, not instant). Search owns the
 * page CTA, so these paths stay outline + text. Unfinished district work
 * lives on /districts.
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

/**
 * Schematic office-calendar shape for the district report: a weekday row and
 * three weeks. Hollow squares are school tournaments on their own days; the
 * full-width bar is one district-wide event across every connected school.
 * Illustrative by construction — no dates, no school names, nothing to
 * mistake for a real listing.
 */
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const SCHEMATIC_WEEKS = 3;
const SCHOOL_MARK_DAYS = new Set([2, 11, 16]);
const DISTRICT_WEEK_STARTS_AT = 14;

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

            <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4 sm:px-8">
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Club season
                </p>
                <p className="text-2xs text-muted">Kept by the coach</p>
              </div>
              <ol aria-label="Club season">
                {CLUB_SEASON.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-b border-line px-6 py-4 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-8 sm:py-5"
                  >
                    <span className="border-r border-brand-red/40 pr-3 font-display text-2xl tabular-nums leading-none text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="text-lead font-bold text-foreground">
                          {step.title}
                        </p>
                        <p className="rounded-xl border border-line bg-surface-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-[0.1em] text-muted-strong">
                          {step.mark}
                        </p>
                      </div>
                      <p className="mt-1 max-w-md text-sm text-muted">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="border-t border-line px-6 py-4 text-xs text-muted sm:px-8">
                Causey is not pairings, dues, or a public club directory.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
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
          <article className="rounded-3xl border border-brand-blue/30 bg-brand-blue-soft px-5 py-6 sm:px-7 sm:py-8">
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

            <div className="mt-6 rounded-2xl border border-brand-blue/40 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-brand-blue-strong">
                  District office
                </p>
                <p className="rounded-xl border border-brand-blue/40 bg-brand-blue-soft/60 px-2.5 py-1 text-2xs font-bold uppercase tracking-[0.1em] text-brand-blue-strong">
                  Aggregate totals only
                </p>
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">
                School-level totals. A calendar of school and district
                tournaments. Not a copy of any student’s browsing.
              </p>

              <div
                aria-hidden="true"
                className="mt-4 overflow-hidden rounded-xl border border-line"
              >
                <div className="grid grid-cols-7 gap-px bg-line">
                  {WEEKDAYS.map((day) => (
                    <p
                      key={day}
                      className="bg-white py-1 text-center text-2xs font-semibold text-muted"
                    >
                      {day}
                    </p>
                  ))}
                  {Array.from(
                    { length: SCHEMATIC_WEEKS * WEEKDAYS.length },
                    (_, day) => (
                      <Fragment key={day}>
                        {day === DISTRICT_WEEK_STARTS_AT ? (
                          <div className="col-span-7 bg-white px-1.5 py-1">
                            <div className="h-1.5 rounded-sm bg-brand-blue-strong" />
                          </div>
                        ) : null}
                        <div className="flex h-7 items-center justify-center bg-white">
                          {SCHOOL_MARK_DAYS.has(day) ? (
                            <span className="h-2.5 w-2.5 rounded-sm border-2 border-brand-blue-strong" />
                          ) : null}
                        </div>
                      </Fragment>
                    )
                  )}
                </div>
              </div>

              <ul className="mt-4 space-y-3 border-t border-line pt-4">
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm border-2 border-brand-blue-strong"
                  />
                  <p className="text-sm">
                    <span className="font-bold text-foreground">
                      School tournament.
                    </span>{" "}
                    <span className="text-muted">
                      Coach runs the roster and the day.
                    </span>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-5 shrink-0 rounded-sm bg-brand-blue-strong"
                  />
                  <p className="text-sm">
                    <span className="font-bold text-foreground">
                      District-wide.
                    </span>{" "}
                    <span className="text-muted">
                      One event, every connected school.
                    </span>
                  </p>
                </li>
              </ul>
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
