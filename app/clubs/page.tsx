import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Clubs and teams",
  description:
    "Create a club or team on Causey: roster, travel and hosted events, attendance, recorded results, and a season CSV. Chess search is the densest public index.",
};

const seasonSteps = [
  {
    title: "Create the club",
    description:
      "Start a club or team workspace and share the student join link. Type stays locked after you choose club or team.",
  },
  {
    title: "Find or host events",
    description:
      "Public chess search is the usual travel path. Host when the club runs its own tournament. Families still finish paid entry on the organizer’s site.",
  },
  {
    title: "Invite, RSVP, register",
    description:
      "Invite the roster, collect going / not going, and track who still needs to finish organizer registration off Causey.",
  },
  {
    title: "Attendance and results",
    description:
      "Mark who attended, then record division, place, or award. Blanks mean not recorded. Export a season CSV when a board or parent asks.",
  },
];

const included = [
  {
    title: "Roster and groups",
    description: "Join links, CSV claim links, coaches, and read-only assistants.",
  },
  {
    title: "Travel and host",
    description: "Mark “club is going,” host draft → preview → publish, Club/Team-only audience.",
  },
  {
    title: "Family desk",
    description: "Parents RSVP and finish organizer registration from one place per child.",
  },
  {
    title: "Season file",
    description: "Attendance, recorded places/awards, and a downloadable CSV.",
  },
];

const notIncluded = [
  "Recurring practice nights",
  "A public club directory",
  "Live USCF/NSDA lookup",
  "Pairings/ballots",
  "Dues",
  "Coach–parent DMs",
];

export default function ClubsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12 lg:py-12">
          <div className="relative z-10 min-w-0">
            <div className="animate-rise" data-hero-brand>
              <CauseyLogo size="hero" />
            </div>
            <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[16ch] font-display text-display-xl tracking-tight text-foreground sm:mt-6">
              A club season, from roster to results.
            </h1>
            <p className="animate-rise animate-rise-delay-1 mt-4 max-w-prose text-md text-muted">
              Causey helps a club find events, get students and families to the
              right ones, record who went and how they finished, and keep a
              season file. Chess clubs get the most listings; a debate, STEM,
              arts, or writing club can use the same roster and hosting tools
              with fewer public events in the directory. A club is not a school
              and not a district.
            </p>
            <div className="animate-rise animate-rise-delay-2 mt-6 flex flex-wrap items-center gap-4">
              <Link href="/signup?role=coach" className="cta-enabled inline-flex">
                Create a club account
              </Link>
              <Link
                href="/#search"
                className="text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                Search tournaments
              </Link>
            </div>
          </div>

          <ScrollReveal className="relative z-10 min-w-0">
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                How a club season runs
              </p>
              <ol className="mt-4 divide-y divide-line border-y border-line">
                {seasonSteps.map((step, index) => (
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

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
          <ScrollReveal>
            <div className="rounded-2xl border border-line bg-background p-5 sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                What a club can do
              </h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {included.map((item) => (
                  <li key={item.title} className="py-3">
                    <p className="text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <div className="rounded-2xl border border-line bg-background p-5 sm:p-6">
              <h2 className="font-display text-display tracking-tight text-foreground">
                Needs for a professional club
              </h2>
              <p className="mt-2 text-sm text-muted">
                Not building unless you ask.
              </p>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {notIncluded.map((item) => (
                  <li key={item} className="py-3 text-sm text-muted">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted">
                School districts are provisioned by Causey, not created here.{" "}
                <Link
                  href="/districts"
                  className="font-bold text-muted-strong hover:text-brand-red"
                >
                  Review the district pilot →
                </Link>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
