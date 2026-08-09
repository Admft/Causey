import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

export const metadata: Metadata = {
  title: "Schools and districts",
  description:
    "Review Causey's assisted chess pilot for school provisioning, participation workflows, and aggregate district reporting.",
};

const pilotSteps = [
  {
    title: "We set up your schools",
    description:
      "Causey creates the district, checks that each school is real, and gives control of each one to the administrator you name.",
  },
  {
    title: "Staff invite their own people",
    description:
      "Coaches and school administrators share join links with students, families, and other staff. No shared passwords, and no one gets district-wide access to student accounts.",
  },
  {
    title: "Coaches run the events",
    description:
      "Post a tournament to a team, see who can go, track who still needs to register with the organizer, and mark attendance on the day.",
  },
  {
    title: "The district sees the totals",
    description:
      "Participation and attendance counts by school, so the district office can answer questions without reading individual student records.",
  },
];

export default function DistrictsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="animate-rise">
            <CauseyLogo size="hero" />
          </div>
          <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[20ch] font-display text-display-xl font-bold tracking-tight text-foreground sm:mt-6">
            Chess for a whole district, set up with you.
          </h1>
          <p className="animate-rise animate-rise-delay-1 mt-4 max-w-2xl text-md text-muted">
            Anyone can search tournaments on Causey for free. A district pilot
            adds the work a school program actually runs on: getting students
            and staff onto the right teams, telling families about each event,
            recording who attended, and giving the district participation
            numbers it can report.
          </p>
          <p className="animate-rise animate-rise-delay-1 mt-3 max-w-2xl text-base text-muted">
            Setup is hands-on today. Live email verification and a legal review
            still come before any student rollout.
          </p>
          <div className="animate-rise animate-rise-delay-2 mt-7 flex flex-wrap items-center gap-4">
            <a
              href={FOUNDING_TEAM_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Book a district pilot conversation with Causey in a new tab"
              className="cta-enabled inline-flex"
            >
              Book a district pilot conversation{" "}
              <span aria-hidden="true" className="ml-2 nudge-x">
                ↗
              </span>
            </a>
            <Link
              href="/privacy"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Review student data practices
            </Link>
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-14 lg:gap-20">
            <div>
              <h2 className="font-display text-display font-bold tracking-tight text-foreground">
                What setup looks like
              </h2>
              <p className="mt-3 text-base text-muted">
                We work through these four stages with you. There is no instant
                district signup, and Causey does not list a school, a coach, or
                a student before the district signs.
              </p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {pilotSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid gap-2 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4"
                >
                  <span className="text-sm font-semibold text-brand-red">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--blue bg-brand-blue-soft/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="font-display text-display font-bold tracking-tight text-foreground">
              Everyone sees only their own part
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">
              District administrators manage schools and see totals. School
              administrators manage staff and settings. Coaches manage their
              own teams and events. Parents and students see only what belongs
              to them.
            </p>
          </div>
          <div className="md:border-l md:border-line md:pl-12">
            <h2 className="font-display text-display font-bold tracking-tight text-foreground">
              What we have not finished
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">
              Before a paid student rollout, Causey and the district still have
              to settle price, support, privacy, how long data is kept, and
              security, and Causey has to prove its email delivery at school
              volume. This is a pilot, not a finished procurement package.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
