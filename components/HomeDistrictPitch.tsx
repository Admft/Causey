import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * District pitch as a product moment, not a brochure: the right column shows
 * an illustrative district pilot preview that mirrors the real command center
 * (next step, school readiness, hairline roster), and the pilot's four stages
 * run as a numbered strip below. Preview data is labeled illustrative — the
 * statuses are the product's real readiness states.
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

const PREVIEW_SCHOOLS = [
  { name: "Washington Elementary", status: "Ready", ready: true },
  {
    name: "Jefferson Middle School",
    status: "Awaiting administrator claim",
    ready: false,
  },
  {
    name: "Lincoln High School",
    status: "Needs platform verification",
    ready: false,
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
                href="https://causey.dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Talk with the Causey founding team on causey.dev in a new tab"
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
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold text-muted-strong">
                  District pilot preview
                </p>
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Illustrative
                </p>
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">
                Example Unified School District
              </p>
              <p className="mt-1 text-sm text-muted">
                Next step: finish verification for Lincoln High School.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-muted-strong">
                    School pilot readiness
                  </span>
                  <span className="text-muted">1 of 3 ready</span>
                </div>
                <div className="mt-2 h-1.5 rounded-lg bg-surface-soft">
                  <div className="h-full w-1/3 rounded-lg bg-brand-red" />
                </div>
              </div>

              <ul className="mt-4 divide-y divide-line border-y border-line">
                {PREVIEW_SCHOOLS.map((school) => (
                  <li
                    key={school.name}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {school.name}
                    </span>
                    <span
                      className={
                        school.ready
                          ? "text-xs font-semibold text-brand-red"
                          : "text-xs text-muted"
                      }
                    >
                      {school.status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Participation rollups by school. No district-wide student
                roster.
              </p>
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
