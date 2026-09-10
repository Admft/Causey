import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { ClubWorkspaceShowcase } from "@/components/ClubWorkspaceShowcase";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  SEARCH_TOURNAMENTS_LABEL,
  START_A_CLUB_LABEL,
  START_CLUB_SIGNUP_HREF,
} from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: "Clubs and teams",
  description:
    "Run a club or team season on Causey: roster, travel, attendance, recorded results, and a season file that exports as CSV. Public chess search is the densest index today.",
};

const ledgerLines = [
  "Roster and guardians join from one link",
  "Travel RSVPs turn into headcounts",
  "Attendance and results write the season file",
];

const seasonRows = [
  {
    date: "Sep 12",
    event: "Invitational, away",
    meta: "14 players · organizer registration open",
    status: "Registered",
    active: true,
  },
  {
    date: "Oct 3",
    event: "League night, home",
    meta: "18 players · headcount closes this week",
    status: "RSVPs open",
    active: true,
  },
  {
    date: "Oct 24",
    event: "Regional qualifier",
    meta: "Qualifying roster · location to be set",
    status: "Watching",
    active: false,
  },
];

const clubSeat = [
  "Own roster and groups",
  "Travel, hosting, and RSVPs",
  "Attendance and results entry",
  "Season file and CSV export",
];

const districtSeat = [
  "Read-only totals by school",
  "School provisioning",
  "District-wide events",
  "Aggregate exports",
];

const seasonFileRows = [
  { label: "Players on the roster", width: "w-28" },
  { label: "Events played", width: "w-20" },
  { label: "Travel meets", width: "w-12" },
  { label: "Results recorded", width: "w-24" },
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

function ScopeList({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-display-sm tracking-tight text-foreground">
        {title}
      </h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.title} className="py-3.5">
            <p className="text-sm font-bold text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ClubsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:py-10">
          <div className="animate-rise relative z-10 lg:col-span-2">
            <PageBackLink />
            <div data-hero-brand className="mt-5">
              <CauseyLogo size="hero" />
            </div>
          </div>

          <div className="animate-rise relative z-10 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
              For clubs and teams
            </p>
            <h1 className="mt-2 max-w-[16ch] font-display text-display md:text-display-lg tracking-tight text-foreground">
              Run the season,{" "}
              <span className="marker-highlight">not the spreadsheet.</span>
            </h1>
            <p className="mt-4 max-w-prose text-md text-muted">
              Roster, travel, attendance, and results in one workspace your
              whole coaching staff can use. Chess clubs get the densest public
              listings today; other types run the same tools with a thinner
              directory.
            </p>
            <ul className="mt-5 space-y-1.5">
              {ledgerLines.map((line) => (
                <li
                  key={line}
                  className="flex items-baseline gap-2.5 text-sm font-semibold text-muted-strong"
                >
                  <span aria-hidden="true" className="text-brand-red">
                    —
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href={START_CLUB_SIGNUP_HREF} className="cta-enabled inline-flex">
                {START_A_CLUB_LABEL}
              </Link>
              <Link
                href="#season-file"
                className="group text-sm font-bold text-muted-strong hover:text-brand-red"
              >
                See a sample season file{" "}
                <span aria-hidden="true" className="nudge-x">
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="animate-rise animate-rise-delay-1 relative z-10 min-w-0">
            <ClubWorkspaceShowcase />
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <header className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                One season, one ledger
              </p>
              <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                The season as a ruled list.
              </h2>
              <p className="mt-2 max-w-prose text-sm text-muted">
                Every event lands on the same page: when it is, who is going,
                and where it stands.
              </p>
            </header>
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {seasonRows.map((row) => (
                <li
                  key={row.event}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6 sm:py-4"
                >
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {row.date}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">
                      {row.event}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {row.meta}
                    </span>
                  </span>
                  <span
                    className={`col-start-2 text-2xs font-bold uppercase tracking-[0.06em] sm:col-start-auto sm:text-right ${
                      row.active ? "text-brand-blue-strong" : "text-muted"
                    }`}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-2xs text-muted">
              A sample season for illustration. These rows are not real
              listings.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <header className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Same season, two seats
              </p>
              <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                Clubs run the season. Districts watch it add up.
              </h2>
            </header>
            <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
              <div className="grid gap-px bg-line sm:grid-cols-2">
                <div className="bg-surface px-6 py-5 sm:px-8 sm:py-6">
                  <p className="text-sm font-bold text-foreground">Club seat</p>
                  <ul className="mt-3 space-y-2">
                    {clubSeat.map((line) => (
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
                <div className="bg-surface px-6 py-5 sm:px-8 sm:py-6">
                  <p className="text-sm font-bold text-foreground">
                    District seat
                  </p>
                  <ul className="mt-3 space-y-2">
                    {districtSeat.map((line) => (
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
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line px-6 py-4 sm:px-8">
                <p className="text-sm font-bold text-foreground">
                  No extra logins, no duplicate entry.
                </p>
                <p className="text-xs text-muted">
                  Clubs keep their workspace; districts get the read-only
                  aggregate view.{" "}
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
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="season-file"
        className="home-band band-join band-join--surface scroll-mt-24 bg-surface"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
              The season file
            </p>
            <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
              The season ends. The file is already written.
            </h2>
            <p className="mt-3 max-w-prose text-sm text-muted">
              Attendance, places, and awards are recorded as the season runs.
              When a board, a parent, or next year’s budget asks, the answer
              is an export, not a project.
            </p>
            <p className="mt-4 max-w-prose text-sm text-muted">
              Blanks stay blank: a missing result means not recorded, never a
              zero.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <div
              aria-hidden="true"
              className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <div className="flex items-baseline gap-3 border-b border-line pb-4">
                <div className="min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Season file
                  </p>
                  <p className="mt-1 font-display text-lead text-foreground">
                    Your club, fall season
                  </p>
                </div>
                <span className="ml-auto shrink-0 rounded-lg border border-line px-2.5 py-1 text-2xs font-bold text-muted-strong">
                  Export CSV
                </span>
              </div>
              <div className="divide-y divide-line">
                {seasonFileRows.map((row, index) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="text-2xs font-bold text-muted-strong">
                      {row.label}
                    </span>
                    <span
                      className={`showcase-bar ml-auto h-3.5 rounded-sm bg-brand-blue-strong/70 ${row.width}`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    />
                  </div>
                ))}
              </div>
              <p className="border-t border-line pt-3 text-2xs text-muted">
                Attendance, places, and awards. Written as the season ran.
              </p>
            </div>
            <p className="mt-3 text-2xs text-muted">
              Sample layout. The real file exports from the club workspace as
              a CSV.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              <ScopeList
                eyebrow="In the workspace"
                title="What a club can do"
                items={included}
              />
              <ScopeList
                eyebrow="Not building unless you ask"
                title="Needs for a professional club"
                items={notIncluded}
              />
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
                  Self-serve, not a pilot
                </p>
                <h2 className="mt-2 max-w-[20ch] font-display text-display tracking-tight text-foreground lg:max-w-none">
                  Start your club.
                </h2>
                <p className="mt-3 text-sm text-muted">
                  Clubs and teams create their own workspace and get a join
                  link in minutes. Chess has the deepest public listings
                  today; every other type runs the same season tools while its
                  directory fills in.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 self-start md:self-stretch md:justify-end">
                <Link
                  href={START_CLUB_SIGNUP_HREF}
                  className="cta-enabled inline-flex max-w-full md:shrink-0"
                >
                  {START_A_CLUB_LABEL}
                </Link>
                <Link
                  href="/#search"
                  className="text-sm font-bold text-muted-strong hover:text-brand-red"
                >
                  {SEARCH_TOURNAMENTS_LABEL}
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
