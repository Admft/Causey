"use client";

import { useEffect, useRef, useState } from "react";

/**
 * /districts hero: the district office workspace is the pitch. One window
 * auto-plays three real product views (Overview, Competitions, Reports) on a
 * slow loop until the visitor picks a tab or keyboard-focuses it; hovering
 * pauses. All content is wireframe vocabulary — numbered "School" rows and
 * bars, no names, dates, or counts — so there is nothing to mistake for
 * data. Reduced motion gets the static Overview with bars at final state.
 */

const VIEWS = ["Overview", "Competitions", "Reports"] as const;
type View = (typeof VIEWS)[number];

const AUTOPLAY_MS = 5200;

const SCHOOL_BARS = [
  { width: "w-24", delay: 0 },
  { width: "w-32", delay: 70 },
  { width: "w-20", delay: 140 },
  { width: "w-28", delay: 210 },
  { width: "w-16", delay: 280 },
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

function Bar({
  width,
  delay,
  strong = false,
}: {
  width: string;
  delay: number;
  strong?: boolean;
}) {
  return (
    <span
      className={`showcase-bar ml-auto h-3.5 rounded-sm ${
        strong ? "bg-brand-blue-strong" : "bg-brand-blue-strong/70"
      } ${width}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function SchoolRow({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
      <span className="text-2xs font-bold tabular-nums text-muted">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="text-2xs font-bold text-muted-strong">School</span>
      {children}
    </div>
  );
}

function OverviewView() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-soft/70 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
            Next action
          </p>
          <p className="mt-0.5 truncate text-2xs font-bold text-foreground">
            Finish setup for the remaining schools
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-lg border border-line bg-white px-2.5 py-1 text-2xs font-bold text-muted-strong">
          Open Schools
        </span>
      </div>
      <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">
        Participation by school
      </p>
      <div className="flex-1 space-y-2.5">
        {SCHOOL_BARS.map((bar, index) => (
          <SchoolRow key={index} index={index}>
            <Bar width={bar.width} delay={bar.delay} />
          </SchoolRow>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-3">
        <span className="text-2xs font-bold text-foreground">
          District total
        </span>
        <Bar width="w-40" delay={360} strong />
      </div>
    </div>
  );
}

function CompetitionsView() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-xl border border-brand-blue/40 bg-brand-blue-soft/50 p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-white">
            <span className="h-1 w-4 rounded-sm bg-brand-blue-strong/60" />
            <span className="h-2 w-5 rounded-sm bg-foreground/20" />
          </span>
          <div className="min-w-0">
            <p className="text-2xs font-bold text-foreground">
              District-wide tournament
            </p>
            <p className="mt-0.5 text-2xs text-muted">
              One event · every connected school
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-xl border border-brand-blue/40 bg-white px-2.5 py-1 text-2xs font-bold text-brand-blue-strong">
            District-wide
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {[true, true, true, false].map((going, index) => (
          <SchoolRow key={index} index={index}>
            <span
              className={`ml-auto flex items-center gap-2 text-2xs font-bold ${
                going ? "text-brand-blue-strong" : "text-muted"
              }`}
            >
              {going ? "Going" : "Invited"}
              <CheckBox checked={going} />
            </span>
          </SchoolRow>
        ))}
      </div>
      <p className="border-t border-line pt-3 text-2xs text-muted">
        Schools mark themselves going. The office watches it fill in.
      </p>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center border-b border-line pb-3">
        <span className="text-2xs font-bold uppercase tracking-[0.08em] text-foreground">
          Season totals
        </span>
        <span className="ml-auto rounded-lg border border-line px-2.5 py-1 text-2xs font-bold text-muted-strong">
          Export CSV
        </span>
      </div>
      <div className="flex items-center text-2xs font-bold uppercase tracking-[0.08em] text-muted">
        <span>School</span>
        <span className="ml-auto">Attended</span>
      </div>
      <div className="flex-1 space-y-3.5 pt-1">
        {SCHOOL_BARS.map((bar, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-2xs font-bold tabular-nums text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-2xs font-bold text-muted-strong">School</span>
            <Bar width={bar.width} delay={bar.delay} />
          </div>
        ))}
      </div>
      <p className="border-t border-line pt-3 text-2xs text-muted">
        What a board asks for, in one file. Totals, never a student’s
        browsing.
      </p>
    </div>
  );
}

export function DistrictOfficeShowcase() {
  const [view, setView] = useState<View>("Overview");
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || hovered || interacted) return;
    const interval = window.setInterval(() => {
      setView((current) => VIEWS[(VIEWS.indexOf(current) + 1) % VIEWS.length]);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(interval);
  }, [visible, hovered, interacted]);

  const select = (next: View) => {
    setInteracted(true);
    setView(next);
  };

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setInteracted(true)}
    >
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)]">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <span className="text-xs font-bold text-foreground">
            Your district
          </span>
          <span className="rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
            District account
          </span>
          <span className="ml-auto hidden text-2xs font-semibold text-muted sm:inline">
            causey.dev/orgs/your-district
          </span>
        </div>
        <div
          className="flex items-center gap-1 border-b border-line px-3 py-2"
          aria-label="Preview district workspace views"
        >
          {VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => select(option)}
              className={`rounded-md px-2.5 py-1 text-2xs font-bold transition-colors ${
                view === option
                  ? "border border-brand-blue/40 bg-brand-blue-soft text-brand-blue-strong"
                  : "border border-transparent text-muted-strong hover:bg-surface-soft"
              }`}
            >
              {option}
            </button>
          ))}
          <div
            aria-hidden="true"
            className="ml-auto flex items-center gap-1.5 pr-1"
          >
            {VIEWS.map((option) => (
              <span
                key={option}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                  view === option ? "bg-brand-blue-strong" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="px-5 py-5">
          <div
            key={view}
            className="animate-rise flex min-h-[20rem] flex-col sm:min-h-[21rem]"
          >
            {view === "Overview" ? (
              <OverviewView />
            ) : view === "Competitions" ? (
              <CompetitionsView />
            ) : (
              <ReportsView />
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-2xs text-muted">
        Illustrative preview of the district workspace. Schools and totals are
        wireframe, not real data.
      </p>
      <p className="sr-only">
        The preview cycles through three wireframe views of the Causey district
        workspace: participation totals by school, a district-wide tournament
        with schools marked going, and an exportable season report. It uses no
        real school data.
      </p>
    </div>
  );
}
