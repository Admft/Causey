import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";
import { START_A_CLUB_LABEL, START_CLUB_SIGNUP_HREF } from "@/lib/portal-copy";

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
  {
    title: "Announcements",
    description: "Post to the club from the workspace. This is not a parent inbox.",
  },
  {
    title: "Website and meeting note",
    description: "A member-only site link and a practice/meeting line on the overview.",
  },
];

const notIncluded = [
  {
    title: "Recurring practice nights",
    description: "The overview can hold a meeting note. It is not a weekly schedule.",
  },
  {
    title: "A public club directory",
    description: "Clubs stay member-only until owner and legal say otherwise.",
  },
  {
    title: "Live USCF/NSDA lookup",
    description: "IDs can be typed on a roster. Causey does not look them up live.",
  },
  {
    title: "Pairings/ballots",
    description: "Coordination and discovery, not SwissSys or Tabroom.",
  },
  {
    title: "Dues",
    description:
      "Causey does not collect student dues or tournament entry. Families still pay the organizer.",
  },
  {
    title: "Coach–parent DMs",
    description: "RSVP and announcements cover follow-through. There is no messenger.",
  },
];

function ScopeColumn({
  eyebrow,
  title,
  items,
  className = "",
}: {
  eyebrow: string;
  title: string;
  items: { title: string; description: string }[];
  className?: string;
}) {
  return (
    <div
      className={`grid min-w-0 lg:row-span-7 lg:grid-rows-subgrid ${className}`}
    >
      <header className="px-6 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
          {title}
        </h2>
      </header>
      {items.map((item) => (
        <div
          key={item.title}
          className="border-t border-line px-6 py-5 last:pb-6 sm:px-8 sm:py-6 sm:last:pb-8"
        >
          <p className="text-lead font-bold text-foreground">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function ClubsPage() {
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
                A club season, from roster to results.
              </h1>
              <p className="mt-4 max-w-prose text-md text-muted">
                Causey helps a club find events, get students and families to the
                right ones, record who went and how they finished, and keep a
                season file. Chess clubs get the most listings; a debate, STEM,
                arts, or writing club can use the same roster and hosting tools
                with fewer public events in the directory. A club is not a school
                and not a district.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href={START_CLUB_SIGNUP_HREF} className="cta-enabled inline-flex">
                  {START_A_CLUB_LABEL}
                </Link>
                <Link
                  href="/#search"
                  className="text-sm font-bold text-muted-strong hover:text-brand-red"
                >
                  Search tournaments
                </Link>
              </div>
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

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)] lg:grid lg:grid-cols-2 lg:grid-rows-[auto_repeat(6,auto)]">
              <ScopeColumn
                className="max-lg:border-b max-lg:border-line lg:border-r lg:border-line"
                eyebrow="In the workspace"
                title="What a club can do"
                items={included}
              />
              <ScopeColumn
                eyebrow="Not building unless you ask"
                title="Needs for a professional club"
                items={notIncluded}
              />
            </div>
          </ScrollReveal>
          <p className="mt-5 rounded-3xl border border-line bg-surface p-5 text-sm text-muted shadow-[var(--shadow-card)] sm:p-6">
            School districts are provisioned by Causey, not created here.{" "}
            <Link
              href="/districts"
              className="group font-bold text-muted-strong hover:text-brand-red"
            >
              Review the district pilot{" "}
              <span aria-hidden="true" className="nudge-x">
                →
              </span>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
