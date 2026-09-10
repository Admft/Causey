/**
 * /clubs hero: the club workspace is the pitch. One static window showing the
 * roster view a coach actually runs — player rows with RSVP/registration
 * status, plus the next event and the season taking shape. All content is
 * wireframe vocabulary — numbered "Player" rows, generic event types, and
 * bars, no names, dates, or counts — so there is nothing to mistake for data.
 * Static by design: the clubs page stays a quiet ledger, and reduced motion
 * loses nothing.
 */

const TABS = ["Overview", "Roster", "Travel", "Attendance", "Results"] as const;

const ROSTER_ROWS = [
  { status: "Registered", done: true },
  { status: "RSVP’d", done: true },
  { status: "Guardian on file", done: true },
  { status: "Invited", done: false },
];

const SEASON_BARS = [
  { label: "Events", width: "w-28", delay: 0 },
  { label: "Travel meets", width: "w-16", delay: 70 },
  { label: "Players", width: "w-24", delay: 140 },
];

function CheckMark() {
  return (
    <svg
      viewBox="0 0 10 8"
      className="h-2.5 w-3 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 4l2.5 2.5L9 1" />
    </svg>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked
          ? "border-brand-blue-strong bg-brand-blue-strong"
          : "border-line bg-white"
      }`}
    >
      {checked ? <CheckMark /> : null}
    </span>
  );
}

function Bar({ width, delay }: { width: string; delay: number }) {
  return (
    <span
      className={`showcase-bar ml-auto h-3.5 rounded-sm bg-brand-blue-strong/70 ${width}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export function ClubWorkspaceShowcase() {
  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)]">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <span className="text-xs font-bold text-foreground">Your club</span>
          <span className="rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
            Club account
          </span>
          <span className="ml-auto hidden text-2xs font-semibold text-muted sm:inline">
            causey.dev/orgs/your-club
          </span>
        </div>
        <div
          aria-hidden="true"
          className="flex items-center gap-1 border-b border-line px-3 py-2"
        >
          {TABS.map((tab) => (
            <span
              key={tab}
              className={`rounded-md px-2.5 py-1 text-2xs font-bold ${
                tab === "Roster"
                  ? "border border-brand-blue/40 bg-brand-blue-soft text-brand-blue-strong"
                  : "border border-transparent text-muted-strong"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
            <div className="space-y-2.5">
              {ROSTER_ROWS.map((row, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
                >
                  <span className="text-2xs font-bold tabular-nums text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-2xs font-bold text-muted-strong">
                    Player
                  </span>
                  <span
                    className={`ml-auto flex items-center gap-2 text-2xs font-bold ${
                      row.done ? "text-brand-blue-strong" : "text-muted"
                    }`}
                  >
                    {row.status}
                    <CheckBox checked={row.done} />
                  </span>
                </div>
              ))}
              <p className="pt-1 text-2xs text-muted">
                One invite link builds this list.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-brand-blue/40 bg-brand-blue-soft/50 p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Next up
                </p>
                <p className="mt-1 text-2xs font-bold text-foreground">
                  League night, home
                </p>
                <p className="mt-0.5 text-2xs text-muted">RSVPs open</p>
                <div className="mt-2.5 flex items-center gap-3 border-t border-brand-blue/25 pt-2.5">
                  <span className="text-2xs font-bold text-muted-strong">
                    Headcount
                  </span>
                  <Bar width="w-16" delay={210} />
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-line p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
                  This season
                </p>
                <div className="mt-2.5 space-y-2.5">
                  {SEASON_BARS.map((bar) => (
                    <div key={bar.label} className="flex items-center gap-3">
                      <span className="text-2xs font-bold text-muted-strong">
                        {bar.label}
                      </span>
                      <Bar width={bar.width} delay={bar.delay} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-2xs text-muted">
        Illustrative preview of the club workspace. Players, events, and counts
        are wireframe, not real data.
      </p>
      <p className="sr-only">
        The preview shows the Causey club workspace on its Roster view: player
        rows with registration and RSVP status, the next event with its
        headcount filling in, and season totals drawn as bars. It uses no real
        club data.
      </p>
    </div>
  );
}
