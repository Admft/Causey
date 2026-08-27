import Link from "next/link";
import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery. One chassis (not two stamped cards): club
 * season walk on the left, assisted district pilot on the right, planned work
 * as the lower deck. Search already owns the page CTA, so these paths use an
 * outline button plus one text action. Numbering is only on the club season
 * (roster → results). District-ready and planned-next stay unnumbered.
 */
const CLUB_SEASON = [
  {
    title: "Roster",
    description:
      "Invite students with a join link or CSV. Groups are for invites and attendance.",
  },
  {
    title: "Travel or host",
    description:
      "Mark the club as going to a public event, or publish a club tournament.",
  },
  {
    title: "Attendance",
    description:
      "Mark who showed up on the day, including travel events the club attended.",
  },
  {
    title: "Results",
    description:
      "Record place or award, then export a season CSV when a board asks.",
  },
];

const DISTRICT_READY = [
  {
    title: "Schools in the district",
    description:
      "A district oversees participating schools without running each team’s daily work.",
  },
  {
    title: "Access based on each role",
    description:
      "District staff, school staff, coaches, parents, and students each see the work meant for them.",
  },
  {
    title: "School and district tournaments",
    description:
      "Schools host their own events. The district can host a district-wide tournament.",
  },
  {
    title: "Participation across schools",
    description:
      "District staff review school-level totals without opening individual student records.",
  },
];

const PLANNED_NEXT = [
  {
    title: "Guided district setup",
    description:
      "Turn today’s assisted setup into a guided onboarding flow after the pilot requirements are proven.",
  },
  {
    title: "Stronger family follow-through",
    description:
      "Expand reminders and action tracking so schools can see what families still need to complete.",
  },
  {
    title: "Reporting over time",
    description:
      "Add district-ready trends and exports for participation across schools and seasons.",
  },
  {
    title: "More competition types",
    description:
      "Extend the same school workflows beyond chess as each new competition directory becomes usable.",
  },
];

function BuyerColumn({
  className = "",
  eyebrow,
  headingId,
  heading,
  lede,
  children,
  actions,
}: {
  className?: string;
  eyebrow: string;
  headingId: string;
  heading: string;
  lede: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <article
      className={`grid scroll-mt-20 grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:row-span-4 lg:grid-rows-subgrid ${className}`}
    >
      <header className="px-6 pt-6 sm:px-8 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
          {eyebrow}
        </p>
        <h2
          id={headingId}
          className="mt-2 max-w-[18ch] font-display text-display tracking-tight text-foreground"
        >
          {heading}
        </h2>
      </header>
      <p className="max-w-prose px-6 pt-3 text-base text-muted sm:px-8">{lede}</p>
      <div className="min-h-0 px-6 pt-6 sm:px-8">{children}</div>
      <div className="flex flex-wrap items-center gap-4 px-6 py-6 sm:px-8 sm:py-8">
        {actions}
      </div>
    </article>
  );
}

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--soft bg-surface-soft"
      aria-labelledby="club-pitch-heading district-pitch-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <ScrollReveal>
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto_minmax(0,1fr)_auto]">
              <BuyerColumn
                className="max-lg:border-b max-lg:border-line lg:border-r lg:border-line"
                eyebrow="Clubs and teams"
                headingId="club-pitch-heading"
                heading="Run a season from roster to results."
                lede="Create a club or team yourself. Causey is the roster, travel, attendance, and season file — not pairings, dues, or a public club directory."
                actions={
                  <>
                    <Link href="/clubs" className="cta-outline inline-flex">
                      See the club workspace
                    </Link>
                    <Link
                      href="/signup?role=coach"
                      className="text-sm font-bold text-muted-strong hover:text-brand-red"
                    >
                      Create a club account
                    </Link>
                  </>
                }
              >
                <ol>
                  {CLUB_SEASON.map((step, index) => {
                    const last = index === CLUB_SEASON.length - 1;
                    return (
                      <li
                        key={step.title}
                        className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4"
                      >
                        <div className="flex flex-col items-center">
                          <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xs font-bold tabular-nums text-brand-red">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {last ? null : (
                            <span
                              aria-hidden="true"
                              className="mt-2 min-h-3 w-0.5 flex-1 bg-brand-red"
                            />
                          )}
                        </div>
                        <div className={last ? "pb-0" : "pb-6"}>
                          <p className="text-lead font-bold text-foreground">
                            {step.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </BuyerColumn>

              <BuyerColumn
                eyebrow="School districts"
                headingId="district-pitch-heading"
                heading="Chess for a whole district, set up with you."
                lede="There is no instant district signup. Causey provisions the district and its participating schools for an assisted chess pilot."
                actions={
                  <>
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
                  </>
                }
              >
                <ul className="grid gap-6">
                  {DISTRICT_READY.map((item) => (
                    <li key={item.title}>
                      <p className="text-lead font-bold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </BuyerColumn>
            </div>

            <div className="border-t border-line bg-surface-soft px-6 py-6 sm:px-8 sm:py-7">
              <h2
                id="planned-next-heading"
                className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-strong"
              >
                Planned next
              </h2>
              <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PLANNED_NEXT.map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
