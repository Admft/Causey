import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery: club/team self-serve season on the left,
 * assisted district pilot on the right. Search already owns the page CTA, so
 * these paths use outline buttons. Numbering is only on the club season
 * walk (roster → results). District-ready and planned-next items stay
 * unnumbered so the band is not three 01–04 stacks.
 */
const CLUB_SEASON = [
  {
    title: "Roster",
    description: "Invite students with a join link or CSV. Groups are for invites and attendance.",
  },
  {
    title: "Travel or host",
    description: "Mark the club as going to a public event, or publish a club tournament.",
  },
  {
    title: "Attendance",
    description: "Mark who showed up on the day, including travel events the club attended.",
  },
  {
    title: "Results",
    description: "Record place or award, then export a season CSV when a board asks.",
  },
];

const CLUB_BOARD = [
  { chip: "Sat", title: "Public weekend swiss", meta: "Club is going · invite the roster" },
  { chip: "Sun", title: "Club-hosted dual", meta: "Attendance, then record place" },
  { chip: "CSV", title: "Season file", meta: "Places and awards when a board asks" },
];

const PILOT_STEPS = [
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

const PRIVATE_SETUP_GATES = [
  {
    title: "District and school structure",
    description:
      "A district can oversee participating schools without running each team’s daily work.",
  },
  {
    title: "Access based on each role",
    description:
      "District staff, school staff, coaches, parents, and students each see the work meant for them.",
  },
  {
    title: "Participation across schools",
    description:
      "District staff can review school-level totals without opening individual student records.",
  },
];

const DISTRICT_READINESS = [
  { title: "Administrator claimed", status: "Ready" },
  { title: "Roster started", status: "Ready" },
  { title: "Needs an administrator", status: "Next" },
];

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--soft bg-surface-soft"
      aria-labelledby="organizer-pitch-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <ScrollReveal className="h-full">
            <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-sm font-semibold text-brand-red">Clubs and teams</p>
              <h2
                id="organizer-pitch-heading"
                className="mt-2 max-w-[18ch] font-display text-display tracking-tight text-foreground"
              >
                Run a season from roster to results.
              </h2>
              <p className="mt-3 max-w-prose text-sm text-muted">
                Coaches create a club or team themselves. Causey is coordination
                and discovery, not pairings, dues, or a public club directory.
                Chess listings are the densest; other types can use the same
                roster tools.
              </p>

              <ol className="relative mt-6 flex-1 border-l-2 border-brand-red">
                {CLUB_SEASON.map((step, index) => (
                  <li key={step.title} className="relative pb-5 pl-6 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 left-[-5px] h-3 w-3 rounded-full border-2 border-brand-red bg-brand-red"
                    />
                    <p className="text-xs font-bold tabular-nums tracking-wide text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-line bg-surface-soft p-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                  Illustrative season
                </p>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {CLUB_BOARD.map((row) => (
                    <li
                      key={row.title}
                      className="flex items-baseline gap-3 py-2.5"
                    >
                      <span className="w-10 shrink-0 rounded-xl border border-line bg-surface px-2 py-1 text-center text-2xs font-bold tabular-nums text-foreground">
                        {row.chip}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {row.title}
                        </p>
                        <p className="text-xs text-muted">{row.meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <Link href="/clubs" className="cta-outline inline-flex">
                  See the club workspace
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60} className="h-full">
            <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-sm font-semibold text-brand-red">
                Ready for an assisted pilot
              </p>
              <h3 className="mt-2 font-display text-display tracking-tight text-foreground">
                The district foundation is in place.
              </h3>
              <p className="mt-3 max-w-prose text-sm text-muted">
                Causey already has the foundation for an assisted district
                pilot: connected schools, separate access for each role,
                tournament coordination, and school-level participation totals.
              </p>
              <p className="sr-only">
                Causey already supports the structure and permissions needed to
                connect a district with its participating schools.
              </p>

              <div className="mt-6 rounded-2xl border border-line bg-surface-soft p-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                  Illustrative command center
                </p>
                <p className="mt-3 text-sm font-bold text-foreground">
                  Next: invite a named school administrator
                </p>
                <p className="mt-1 text-xs text-muted">
                  Three connected schools. Totals only — no student browsing.
                </p>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-xl bg-line"
                  aria-hidden="true"
                >
                  <div className="h-full w-2/3 bg-brand-red" />
                </div>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {DISTRICT_READINESS.map((row) => (
                    <li
                      key={row.title}
                      className="flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {row.title}
                      </p>
                      <p className="shrink-0 text-xs font-bold text-muted-strong">
                        {row.status}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-5 divide-y divide-line border-y border-l-2 border-line border-l-brand-blue/40 pl-4">
                {PRIVATE_SETUP_GATES.map((gate) => (
                  <li key={gate.title} className="py-3 pl-3">
                    <p className="text-sm font-bold text-foreground">
                      {gate.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {gate.description}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-4">
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
            </div>
          </ScrollReveal>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            Planned next
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {PILOT_STEPS.map((step) => (
              <li
                key={step.title}
                className="border-l-2 border-line pl-4"
              >
                <p className="text-sm font-bold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted">{step.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
