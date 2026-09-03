import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";
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

const unfinished = [
  {
    title: "Price and support",
    description:
      "Before a paid student rollout, Causey and the district still have to settle price and support.",
  },
  {
    title: "Privacy, retention, and security",
    description:
      "Privacy, how long data is kept, and security still have to be settled with the district.",
  },
  {
    title: "Email at school volume",
    description:
      "Causey has to prove its email delivery at school volume.",
  },
  {
    title: "Independent clubs",
    description:
      "Independent clubs use a separate self-serve workspace. This is a pilot, not a finished procurement package.",
  },
];

const roleSplit = [
  {
    title: "District office",
    description: "Schools, next action, calendar, Reports, Activity. Totals, not student browsing.",
  },
  {
    title: "School administrators",
    description: "Named invitation, ownership handoff, staff and student invites, school events.",
  },
  {
    title: "Coaches",
    description: "Roster, groups, draft → publish, RSVP, attendance, recorded results.",
  },
  {
    title: "Families",
    description: "Family desk for RSVP and unfinished organizer registration on the child’s events.",
  },
];

export default function DistrictsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12 lg:py-10">
          <div className="relative z-10 min-w-0">
            <div className="animate-rise">
              <PageBackLink />
            </div>
            <div className="animate-rise mt-5 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div data-hero-brand>
                <CauseyLogo size="hero" />
              </div>
              <h1 className="mt-5 max-w-[16ch] font-display text-display md:text-display-lg tracking-tight text-foreground sm:mt-6">
                Chess for a whole district, set up with you.
              </h1>
              <p className="mt-4 max-w-prose text-md text-muted">
                Anyone can search tournaments on Causey for free. A district
                pilot uses the same organization workspace as schools — not a custom portal.
                Chess is the working surface; other types can be hosted. The
                pilot still adds what a school program actually runs on: getting
                students and staff onto the right teams, telling families about
                each event, recording who attended, and giving the district
                participation numbers. Setup is hands-on today, and live email
                verification and legal review come before any student rollout.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
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
                  className="text-sm font-bold text-muted-strong hover:text-brand-red"
                >
                  Review student data practices
                </Link>
              </div>
            </div>
          </div>

          <ScrollReveal className="relative z-10 min-w-0">
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                What setup looks like
              </p>
              <p className="mt-2 text-sm text-muted">
                There is no instant district signup. Causey does not list a
                school, a coach, or a student before the district signs.
              </p>
              <ol className="mt-4 divide-y divide-line border-y border-line">
                {pilotSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="text-xs font-bold tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        {step.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--blue bg-brand-blue-soft/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
          <ScrollReveal>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                Everyone sees only their own part
              </h2>
              <ol className="mt-4 divide-y divide-line border-y border-line">
                {roleSplit.map((role) => (
                  <li key={role.title} className="py-3">
                    <p className="text-sm font-bold text-foreground">
                      {role.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{role.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                What we have not finished
              </h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {unfinished.map((item) => (
                  <li key={item.title} className="py-3">
                    <p className="text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                  </li>
                ))}
              </ul>
              <Link
                href="/clubs"
                className="mt-5 inline-block text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                See the club workspace →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
