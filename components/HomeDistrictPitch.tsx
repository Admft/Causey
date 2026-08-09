import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * District pitch as a product moment, not a brochure. The right column names
 * the private setup gates that come before any school is added to Causey; the
 * pilot's four operational stages run as a numbered strip below.
 */
const PILOT_STEPS = [
  {
    title: "Provision and verify",
    description:
      "Causey creates the district, verifies each school, and hands it to its authorized administrator.",
  },
  {
    title: "Invite the right people",
    description:
      "Staff distribute claim links; no shared passwords or district-wide student access.",
  },
  {
    title: "Coordinate tournaments",
    description:
      "Coaches publish scoped events, collect RSVPs, and record attendance.",
  },
  {
    title: "Review participation",
    description:
      "School-level counts and attendance rollups, without browsing student records.",
  },
];

const PRIVATE_SETUP_GATES = [
  {
    title: "Pilot terms are signed",
    description: "Privacy, retention, support, and rollout scope are agreed first.",
  },
  {
    title: "The district names participating schools",
    description: "Causey does not publish a speculative school list.",
  },
  {
    title: "Authorized administrators claim access",
    description: "Staff handoff is verified before invitations or roster work begin.",
  },
];

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="district-pitch-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-12 lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            <p className="text-sm font-semibold text-brand-red">
              Schools and districts
            </p>
            <h2
              id="district-pitch-heading"
              className="mt-2 max-w-[18ch] font-display text-display font-bold tracking-tight text-foreground"
            >
              Run the whole district chess program from one desk.
            </h2>
            <p className="mt-4 max-w-prose text-base text-muted">
              Causey is testing an assisted district pilot for school setup,
              staff handoff, student invitations, tournament attendance, and
              aggregate reporting. It is not a self-serve district purchase
              yet.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/districts" className="cta-enabled inline-flex">
                Review the district pilot
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

          <ScrollReveal className="min-w-0">
            <div className="rounded-2xl border border-line bg-surface-soft p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Private setup first
              </p>
              <h3 className="mt-3 font-display text-xl font-bold text-foreground">
                No school is added before approval.
              </h3>
              <p className="mt-2 text-sm text-muted">
                A district conversation starts the review. It does not create
                a public school profile or student roster.
              </p>

              <ol className="mt-5 divide-y divide-line border-y border-line">
                {PRIVATE_SETUP_GATES.map((gate, index) => (
                  <li
                    key={gate.title}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="text-xs font-semibold tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {gate.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {gate.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-6 border-t border-line pt-8 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
          {PILOT_STEPS.map((step, index) => (
            <li key={step.title}>
              <ScrollReveal delay={index * 60}>
                <p className="text-sm font-semibold tabular-nums tracking-wider text-brand-red">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-base font-semibold text-foreground">
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
