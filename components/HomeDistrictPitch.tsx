import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery: club/team self-serve season on the left,
 * assisted district pilot on the right. Search already owns the page CTA, so
 * these paths use outline buttons. District copy keeps the ready-now /
 * planned-next split used by the public pitch tests.
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

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="organizer-pitch-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 id="organizer-pitch-heading" className="sr-only">
          Club and district workspaces
        </h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <ScrollReveal>
            <div className="flex h-full flex-col rounded-2xl border border-line bg-background p-5 sm:p-6">
              <p className="text-sm font-semibold text-brand-red">Clubs and teams</p>
              <h3 className="mt-2 max-w-[18ch] font-display text-display tracking-tight text-foreground">
                Run a season from roster to results.
              </h3>
              <p className="mt-3 text-sm text-muted">
                Coaches create a club or team themselves. Causey is coordination
                and discovery, not pairings, dues, or a public club directory.
                Chess listings are the densest; other types can use the same
                roster tools.
              </p>
              <ol className="mt-5 flex-1 divide-y divide-line border-y border-line">
                {CLUB_SEASON.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="text-xs font-bold tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5">
                <Link href="/clubs" className="cta-outline inline-flex">
                  See the club workspace
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface-soft p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Ready for an assisted pilot
              </p>
              <h3 className="mt-3 font-display text-xl text-foreground">
                The district foundation is in place.
              </h3>
              <p className="mt-2 text-sm text-muted">
                Causey already has the foundation for an assisted district
                pilot: connected schools, separate access for each role,
                tournament coordination, and school-level participation totals.
                The panel shows what is ready now; the four points below are
                what we plan to build next for districts.
              </p>
              <p className="sr-only">
                Causey already supports the structure and permissions needed to
                connect a district with its participating schools.
              </p>

              <ol className="mt-5 flex-1 divide-y divide-line border-y border-line">
                {PRIVATE_SETUP_GATES.map((gate, index) => (
                  <li
                    key={gate.title}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="text-xs font-bold tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {gate.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {gate.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
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

        <ol className="mt-8 grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PILOT_STEPS.map((step, index) => (
            <li key={step.title}>
              <ScrollReveal delay={index * 60}>
                <p className="text-sm font-bold tabular-nums tracking-wider text-brand-red">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-base font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{step.description}</p>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
