import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { DistrictOfficeShowcase } from "@/components/DistrictOfficeShowcase";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

export const metadata: Metadata = {
  title: "Schools and districts",
  description:
    "Review Causey's assisted chess pilot for school provisioning, participation workflows, and aggregate district reporting.",
};

const officeQuestions = [
  {
    question: "Which schools actually played this semester?",
    answer: "Coaches mark attendance on the day; the office total updates itself.",
    detail: "No spreadsheet to maintain and no end-of-season email chain.",
  },
  {
    question: "Did families finish registering?",
    answer: "Each event shows who is going and who still has registration open.",
    detail:
      "Paid entry still happens on the organizer’s site. Causey tracks that it got done.",
  },
  {
    question: "What do we hand the board at season’s end?",
    answer: "One exported file: participation, attendance, and recorded results by school.",
    detail: "Coaches record places and awards as the season runs, so the file is already written.",
  },
];

const pilotSteps = [
  {
    title: "We set up your schools",
    description:
      "Causey creates the district, checks that each school is real, and gives control of each one to the administrator you name.",
  },
  {
    title: "Staff invite their own people",
    description:
      "Coaches and school administrators share join links with students, families, and staff. No shared passwords, no district-wide access to student accounts.",
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
    title: "Privacy, retention, and security",
    status: "Not settled",
    tone: "outline" as const,
    description:
      "Privacy, how long data is kept, and security still have to be settled with the district.",
  },
  {
    title: "Email at school volume",
    status: "In pilot",
    tone: "yellow" as const,
    description: "Causey has to prove its email delivery at school volume.",
  },
  {
    title: "Independent clubs",
    status: "Separate path",
    tone: "blue" as const,
    description:
      "Independent clubs use a separate self-serve workspace. This is a pilot, not a finished procurement package.",
  },
  {
    title: "Beyond chess",
    status: "Later",
    tone: "outline" as const,
    description:
      "The pilot runs chess. Other types can be hosted; their public indexes are still thin.",
  },
];

const statusTone = {
  outline: "border-line text-muted-strong",
  yellow:
    "border-brand-yellow/50 bg-brand-yellow-soft text-brand-yellow-strong",
  blue: "border-brand-blue/40 bg-brand-blue-soft text-brand-blue-strong",
};

function SeeMark() {
  return (
    <svg
      viewBox="0 0 10 8"
      className="mt-0.5 h-2.5 w-3 shrink-0 text-brand-blue-strong"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 4l2.5 2.5L9 1" />
    </svg>
  );
}

const accessRows = [
  {
    role: "District office",
    sees: ["Totals by school", "Reports, no names"],
  },
  {
    role: "School staff",
    sees: ["Their own school only", "Roster, RSVPs, attendance"],
  },
  {
    role: "Public",
    sees: ["Public listings only", "No accounts, no students"],
  },
];

export default function DistrictsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:py-10">
          <div className="relative z-10 min-w-0">
            <div className="animate-rise">
              <PageBackLink />
            </div>
            <div className="animate-rise mt-5">
              <div data-hero-brand>
                <CauseyLogo size="hero" />
              </div>
              <h1 className="mt-5 max-w-[17ch] font-display text-display md:text-display-lg tracking-tight text-foreground sm:mt-6">
                Every school’s chess season,{" "}
                <span className="marker-highlight">on one page.</span>
              </h1>
              <p className="mt-4 max-w-prose text-md text-muted">
                Chess is the working surface today; other types can be hosted.
                Schools run their own events, families finish paid entry with
                the organizer, and the office sees participation totals by
                school, never a student’s browsing. A pilot uses the{" "}
                same organization workspace as schools, not a custom portal.
                There is no instant district signup.
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

          <div className="animate-rise animate-rise-delay-1 relative z-10 min-w-0">
            <DistrictOfficeShowcase />
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
              <header className="px-6 pb-4 pt-6 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Data access
                </p>
                <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                  Who sees what, before anything else.
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  The office gets totals. Schools get their own students. The
                  public gets listings. Nothing else moves.
                </p>
              </header>
              <div className="border-t border-line">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-brand-blue-soft/50 px-6 py-3.5 sm:px-8">
                  <p className="text-2xs font-bold uppercase tracking-[0.1em] text-brand-blue-strong">
                    Causey
                  </p>
                  <p className="text-xs font-semibold text-muted-strong">
                    Moves events, RSVPs, and totals between the right people.
                    Stores the minimum.
                  </p>
                </div>
                <div className="grid gap-px bg-line sm:grid-cols-3">
                  {accessRows.map((row) => (
                    <div key={row.role} className="bg-surface px-6 py-4 sm:px-8">
                      <p className="text-sm font-bold text-foreground">
                        {row.role}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {row.sees.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-xs font-semibold text-muted-strong"
                          >
                            <SeeMark />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line px-6 py-4 sm:px-8">
                  <p className="text-sm font-bold text-brand-red line-through decoration-brand-red/60 decoration-2">
                    Student browsing history
                  </p>
                  <p className="text-xs text-muted">
                    Visible to no one. Reports carry totals, not what a student
                    searched.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <header className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                What the office stops chasing
              </p>
              <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                Three questions, answered without a spreadsheet.
              </h2>
            </header>
            <ol className="mt-6 border-t border-line">
              {officeQuestions.map((item, index) => (
                <li
                  key={item.question}
                  className="grid gap-2 border-b border-line py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-10 sm:py-6"
                >
                  <p className="font-display text-lead italic text-muted-strong">
                    <span className="mr-2 text-xs font-bold not-italic tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    “{item.question}”
                  </p>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {item.answer}
                    </p>
                    <p className="mt-1 text-xs text-muted">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto grid max-w-6xl items-stretch gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
          <ScrollReveal className="h-full">
            <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                How a district starts
              </h2>
              <ol className="mt-4 flex flex-1 flex-col divide-y divide-line border-y border-line">
                {pilotSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid flex-1 grid-cols-[2rem_minmax(0,1fr)] content-center gap-3 py-3"
                  >
                    <span className="text-xs font-bold tabular-nums text-brand-red">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-auto pt-5 text-xs text-muted">
                No IT project. Setup is a working session with the Causey
                team, and schools join one at a time.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={60} className="h-full">
            <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                What we have not finished
              </h2>
              <ul className="mt-4 flex flex-1 flex-col divide-y divide-line border-y border-line">
                {unfinished.map((item) => (
                  <li
                    key={item.title}
                    className="flex flex-1 flex-col justify-center py-3"
                  >
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                      {item.title}
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] ${statusTone[item.tone]}`}
                      >
                        {item.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                href="/clubs"
                className="group mt-auto inline-block pt-5 text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                See the club workspace{" "}
                <span aria-hidden="true" className="nudge-x">
                  →
                </span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--blue bg-brand-blue-soft/50">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="flex w-full min-w-0 flex-col gap-5 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 md:flex-row md:items-stretch md:justify-between md:gap-8">
              <div className="min-w-0 max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Who is piloting
                </p>
                <h2 className="mt-2 max-w-[20ch] font-display text-display tracking-tight text-foreground lg:max-w-none">
                  Bring Causey to your district.
                </h2>
                <p className="mt-3 text-sm text-muted">
                  Names stay off this page. Districts join the pilot after legal
                  review, and live email verification comes before any student
                  rollout. A conversation is the first step, not a commitment.
                </p>
              </div>
              <div className="flex self-start md:self-stretch md:flex-col md:justify-end">
                <a
                  href={FOUNDING_TEAM_MEETING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Book a district pilot conversation with Causey in a new tab"
                  className="cta-enabled inline-flex max-w-full md:shrink-0"
                >
                  Book a district pilot conversation{" "}
                  <span aria-hidden="true" className="ml-2 nudge-x">
                    ↗
                  </span>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
