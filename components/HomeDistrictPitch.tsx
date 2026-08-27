"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

/**
 * Organizer band under discovery: ONE board that demonstrates the product
 * instead of two brochures describing it. A massive Club/District "window"
 * switch on top re-runs the board: the sliding thumb carries white mirrored
 * labels across the red/blue halves, can be dragged past the midpoint to
 * live-switch modes, and the district half sheens on a slow loop until the
 * visitor tries it once. Mode changes slide the copy and board in the
 * thumb's travel direction. On first scroll entry the season path draws
 * itself and the board auto-plays the four steps once, resting on the
 * finished season. The preview pane is an aria-hidden wireframe labeled
 * with real product vocabulary (join link, club is going, season CSV,
 * aggregate totals) — no names, dates, or counts, so there is nothing to
 * mistake for data. Any interaction stops auto-play; reduced motion gets
 * the instant final state.
 */

type Mode = "club" | "district";

type SeasonStep = {
  title: string;
  description: string;
  /** Product-vocabulary caption over the wireframe sketch. */
  mark: string;
};

const CLUB_STEPS: SeasonStep[] = [
  {
    title: "Roster",
    description: "A join link or a CSV. Groups for invites and the day-of list.",
    mark: "Join link",
  },
  {
    title: "Travel or host",
    description: "Mark the club as going to a public event, or publish one here.",
    mark: "Club is going",
  },
  {
    title: "Attendance",
    description: "Who showed up, including travel events the club attended.",
    mark: "Day of",
  },
  {
    title: "Results",
    description: "Place or award. Export when a board asks.",
    mark: "Season CSV",
  },
];

const DISTRICT_STEPS: SeasonStep[] = [
  {
    title: "Provision",
    description: "The district and its schools are set up with you, one at a time.",
    mark: "Set up with you",
  },
  {
    title: "School tournaments",
    description: "Coaches run the roster and the day at each school.",
    mark: "School tournament",
  },
  {
    title: "District-wide",
    description: "One event, every connected school.",
    mark: "District-wide",
  },
  {
    title: "District office",
    description: "School-level totals. Never a copy of any student’s browsing.",
    mark: "Aggregate totals only",
  },
];

const MODE_COPY: Record<
  Mode,
  { heading: string; intro: string; finePrint: string; caption: string }
> = {
  club: {
    heading: "Run a season from roster to results.",
    intro:
      "Create a club or team yourself. Invite the roster, mark who is going, take attendance, record how they finished.",
    finePrint: "Causey is not pairings, dues, or a public club directory.",
    caption: "Club season",
  },
  district: {
    heading: "Chess for a whole district, set up with you.",
    intro:
      "There is no instant district signup. Causey provisions the district and its participating schools for an assisted chess pilot.",
    finePrint:
      "District staff, school staff, coaches, parents, and students each see the work meant for them.",
    caption: "District pilot",
  },
};

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

function Avatar() {
  return (
    <span className="h-7 w-7 shrink-0 rounded-full border border-line bg-surface-soft" />
  );
}

function DateChip({ tone }: { tone: "red" | "blue" }) {
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface-soft">
      <span
        className={`h-1 w-4 rounded-sm ${
          tone === "red" ? "bg-brand-red/60" : "bg-brand-blue-strong/60"
        }`}
      />
      <span className="h-2 w-5 rounded-sm bg-foreground/20" />
    </span>
  );
}

function CheckBox({
  checked,
  tone,
}: {
  checked: boolean;
  tone: "red" | "blue";
}) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked
          ? tone === "red"
            ? "border-brand-red bg-brand-red"
            : "border-brand-blue-strong bg-brand-blue-strong"
          : "border-line bg-white"
      }`}
    >
      {checked ? <CheckMark /> : null}
    </span>
  );
}

function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-1 flex-col rounded-2xl border border-line bg-white p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function ScreenHeader({
  title,
  action,
  tag,
}: {
  title: string;
  action?: string;
  tag?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line pb-3">
      <span className="text-2xs font-bold uppercase tracking-[0.08em] text-foreground">
        {title}
      </span>
      {action ? (
        <span className="ml-auto rounded-lg border border-line px-2.5 py-1 text-2xs font-bold text-muted-strong">
          {action}
        </span>
      ) : null}
      {tag ? (
        <span className="ml-auto rounded-lg bg-surface-soft px-2.5 py-1 text-2xs font-bold text-muted-strong">
          {tag}
        </span>
      ) : null}
    </div>
  );
}

function EventRow({
  tone,
  title,
  meta,
  chip,
}: {
  tone: "red" | "blue";
  title: string;
  meta: string;
  chip?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <DateChip tone={tone} />
      <div className="min-w-0">
        <p className="text-2xs font-bold text-foreground">{title}</p>
        <p className="mt-1 text-2xs text-muted">{meta}</p>
      </div>
      {chip ? (
        <span
          className={`ml-auto rounded-xl border px-2.5 py-1 text-2xs font-bold ${
            tone === "red"
              ? "border-brand-red/40 bg-accent-soft text-brand-red"
              : "border-brand-blue/40 bg-brand-blue-soft text-brand-blue-strong"
          }`}
        >
          {chip}
        </span>
      ) : null}
    </div>
  );
}

function ClubSketch({ step }: { step: number }) {
  if (step === 0) {
    return (
      <AppCard>
        <ScreenHeader title="Roster" action="Invite" />
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-soft/70 px-3.5 py-3">
          <span className="text-2xs font-bold text-muted-strong">
            Join link
          </span>
          <span className="ml-auto rounded-lg border border-line bg-white px-2.5 py-1 text-2xs font-bold text-muted-strong">
            Copy
          </span>
        </div>
        <div className="mt-3 flex-1 space-y-2.5">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Avatar />
              <span className="text-2xs font-bold text-muted-strong">
                Student
              </span>
              <span className="ml-auto rounded-md border border-line px-2 py-0.5 text-2xs font-bold text-muted">
                Group
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-line py-2.5 text-2xs font-bold text-muted-strong">
          Or upload a CSV
        </div>
      </AppCard>
    );
  }
  if (step === 1) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <AppCard>
          <EventRow
            tone="red"
            title="Public tournament"
            meta="Date · Location"
            chip="Club is going"
          />
          <div className="mt-4 border-t border-line pt-4">
            <EventRow
              tone="red"
              title="Public tournament"
              meta="Date · Location"
            />
          </div>
        </AppCard>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-line py-3 text-2xs font-bold text-muted-strong">
          Host a tournament
        </div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <AppCard>
        <ScreenHeader title="Who showed up" tag="Day of" />
        <div className="mt-3 flex-1 space-y-2.5">
          {[true, true, true, true, false].map((checked, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
            >
              <Avatar />
              <span className="text-2xs font-bold text-muted-strong">
                Student
              </span>
              <span className="ml-auto">
                <CheckBox checked={checked} tone="red" />
              </span>
            </div>
          ))}
        </div>
      </AppCard>
    );
  }
  return (
    <AppCard>
      <ScreenHeader title="Results" action="Season CSV" />
      <div className="mt-3 flex-1 space-y-2.5">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
          >
            <Avatar />
            <span className="text-2xs font-bold text-muted-strong">
              Student
            </span>
            <span className="ml-auto text-2xs text-muted">Division</span>
            <span className="flex h-6 w-12 items-center justify-center rounded-md border border-line bg-surface-soft text-2xs font-bold text-muted">
              —
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-2xs text-muted">Blanks mean not recorded.</p>
    </AppCard>
  );
}

function DistrictSketch({ step }: { step: number }) {
  if (step === 0) {
    return (
      <AppCard>
        <ScreenHeader title="District setup" />
        <div className="mt-3 flex-1 space-y-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
            <CheckBox checked tone="blue" />
            <span className="text-2xs font-bold text-muted-strong">
              District
            </span>
          </div>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="ml-6 flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
            >
              <CheckBox checked tone="blue" />
              <span className="text-2xs font-bold text-muted-strong">
                School
              </span>
            </div>
          ))}
          <div className="ml-6 flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-2.5">
            <CheckBox checked={false} tone="blue" />
            <span className="text-2xs font-bold text-muted">School</span>
            <span className="ml-auto text-2xs font-bold text-muted">Next</span>
          </div>
        </div>
      </AppCard>
    );
  }
  if (step === 1) {
    return (
      <AppCard>
        <EventRow
          tone="blue"
          title="School tournament"
          meta="Hosted by one school"
        />
        <div className="mt-4 flex-1 border-t border-line pt-3">
          <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">
            Coach runs the day
          </p>
          <div className="mt-2.5 space-y-2.5">
            {[true, true, false].map((checked, index) => (
              <div key={index} className="flex items-center gap-3">
                <Avatar />
                <span className="text-2xs font-bold text-muted-strong">
                  Student
                </span>
                <span className="ml-auto">
                  <CheckBox checked={checked} tone="blue" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </AppCard>
    );
  }
  if (step === 2) {
    return (
      <AppCard>
        <EventRow
          tone="blue"
          title="District-wide tournament"
          meta="One event"
        />
        <div className="mt-4 flex-1 space-y-2 border-t border-line pt-3">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2"
            >
              <CheckBox checked tone="blue" />
              <span className="text-2xs font-bold text-muted-strong">
                School
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-line pt-3 text-2xs font-bold text-brand-blue-strong">
          Every connected school
        </p>
      </AppCard>
    );
  }
  return (
    <AppCard>
      <ScreenHeader title="District office" />
      <div className="mt-3 flex items-center text-2xs font-bold uppercase tracking-[0.08em] text-muted">
        <span>School</span>
        <span className="ml-auto">Total</span>
      </div>
      <div className="mt-2 flex-1 space-y-3">
        {["w-28", "w-20", "w-24", "w-16"].map((width, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-2xs font-bold text-muted-strong">School</span>
            <span
              className={`ml-auto h-3.5 rounded-sm bg-brand-blue-strong/70 ${width}`}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-2xs text-muted">
        Not a copy of any student’s browsing.
      </p>
    </AppCard>
  );
}

export function HomeDistrictPitch() {
  const [mode, setMode] = useState<Mode>("club");
  const [active, setActive] = useState(0);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [districtPrompt, setDistrictPrompt] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startPos: number } | null>(null);
  const timersRef = useRef<number[]>([]);
  const reducedRef = useRef(false);

  const steps = mode === "club" ? CLUB_STEPS : DISTRICT_STEPS;
  const copy = MODE_COPY[mode];

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const playThrough = (interval: number, lead: number) => {
    steps.slice(1).forEach((_, index) => {
      const stepIndex = index + 1;
      timersRef.current.push(
        window.setTimeout(() => setActive(stepIndex), lead + stepIndex * interval)
      );
    });
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduce;
    if (reduce) {
      setActive(CLUB_STEPS.length - 1);
      return;
    }
    const el = boardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        playThrough(1500, 600);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimers();
    };
    // Auto-play runs once on first entry; steps never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    clearTimers();
    setDistrictPrompt(false);
    setMode(next);
    if (reducedRef.current) {
      setActive(DISTRICT_STEPS.length - 1);
      return;
    }
    setActive(0);
    playThrough(950, 450);
  };

  const startWindowDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const startPos = mode === "club" ? 0 : 1;
    dragRef.current = { startX: e.clientX, startPos };
    setDragPos(startPos);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveWindowDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;
    const half = track.offsetWidth / 2;
    if (half <= 0) return;
    const next = Math.min(
      1,
      Math.max(0, drag.startPos + (e.clientX - drag.startX) / half)
    );
    setDragPos(next);
    if (next >= 0.5 && mode === "club") switchMode("district");
    else if (next < 0.5 && mode === "district") switchMode("club");
  };

  const endWindowDrag = () => {
    dragRef.current = null;
    setDragPos(null);
  };

  const selectStep = (index: number) => {
    clearTimers();
    setActive(index);
  };

  const isClub = mode === "club";
  const windowPos = dragPos ?? (isClub ? 0 : 1);
  const slideClass = isClub
    ? "animate-mode-slide-from-left"
    : "animate-mode-slide-from-right";
  const accentText = isClub ? "text-brand-red" : "text-brand-blue-strong";
  const nodeFill = isClub
    ? "border-brand-red bg-brand-red"
    : "border-brand-blue-strong bg-brand-blue-strong";

  return (
    <section
      className="home-band band-join band-join--soft scroll-mt-20 bg-surface-soft"
      aria-label="Club and district programs"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <ScrollReveal>
          <div
            ref={boardRef}
            className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)]"
          >
            <div className="border-b border-line px-5 py-5 sm:px-8 sm:py-6">
              <div
                ref={trackRef}
                aria-label="Choose club or district"
                className="relative grid grid-cols-2 rounded-2xl border border-line bg-surface p-1.5 focus-within:ring-2 focus-within:ring-accent/25"
              >
                {(["club", "district"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => switchMode(option)}
                    aria-pressed={mode === option}
                    className={`flex flex-col items-center justify-center rounded-xl px-3 py-3.5 text-center transition-colors sm:py-4 ${
                      option === "club"
                        ? "bg-accent-soft/60 hover:bg-accent-soft"
                        : "bg-brand-blue-soft/60 hover:bg-brand-blue-soft"
                    }`}
                  >
                    <span
                      className={`block text-base font-bold sm:text-lead ${
                        option === "club"
                          ? "text-brand-red"
                          : "text-brand-blue-strong"
                      }`}
                    >
                      {option === "club" ? "Clubs and teams" : "School districts"}
                    </span>
                    <span className="mt-0.5 block text-2xs font-semibold text-muted sm:text-xs">
                      {option === "club"
                        ? "Run it yourself"
                        : "Set up with you"}
                    </span>
                  </button>
                ))}
                {districtPrompt && isClub ? (
                  <span
                    aria-hidden="true"
                    className="mode-sheen absolute inset-y-1.5 right-1.5 z-10 w-[calc(50%-0.375rem)] rounded-xl"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  data-dragging={dragPos !== null ? "" : undefined}
                  className={`mode-thumb absolute inset-y-1.5 left-1.5 z-20 w-[calc(50%-0.375rem)] cursor-grab touch-pan-y select-none overflow-hidden rounded-xl active:cursor-grabbing ${
                    isClub ? "bg-brand-red" : "bg-brand-blue-strong"
                  }`}
                  style={{ transform: `translateX(${windowPos * 100}%)` }}
                  onPointerDown={startWindowDrag}
                  onPointerMove={moveWindowDrag}
                  onPointerUp={endWindowDrag}
                  onPointerCancel={endWindowDrag}
                >
                  <div
                    className="mode-thumb-mirror flex h-full w-[200%]"
                    style={{ transform: `translateX(${-windowPos * 50}%)` }}
                  >
                    {(["club", "district"] as const).map((option) => (
                      <span
                        key={option}
                        className="flex h-full w-1/2 flex-col items-center justify-center px-3 text-center"
                      >
                        <span className="block text-base font-bold text-white sm:text-lead">
                          {option === "club"
                            ? "Clubs and teams"
                            : "School districts"}
                        </span>
                        <span className="mt-0.5 block text-2xs font-semibold text-white sm:text-xs">
                          {option === "club"
                            ? "Run it yourself"
                            : "Set up with you"}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div key={`${mode}-copy`} className={slideClass}>
                <h2 className="mt-5 max-w-[22ch] font-display text-display-lg tracking-tight text-foreground">
                  {copy.heading}
                </h2>
                <p className="mt-3 max-w-prose text-sm text-muted">
                  {copy.intro}
                </p>
              </div>
            </div>

            <div
              key={`${mode}-grid`}
              className={`${slideClass} grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12`}
            >
              <ol
                aria-label={copy.caption}
                className="relative self-start"
              >
                {steps.map((step, index) => (
                  <li key={step.title} className="relative">
                    {index < steps.length - 1 ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-6 left-[15px] top-6 z-10 w-0.5 bg-line sm:left-[19px]"
                        />
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute -bottom-6 left-[15px] top-6 z-10 w-0.5 origin-top transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] sm:left-[19px] ${
                            isClub ? "bg-brand-red" : "bg-brand-blue-strong"
                          } ${index < active ? "scale-y-100" : "scale-y-0"}`}
                        />
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectStep(index)}
                      aria-pressed={index === active}
                      className={`grid w-full grid-cols-[1rem_minmax(0,1fr)] items-start gap-4 rounded-xl px-2 py-3 text-left transition-colors sm:px-3 ${
                        index === active
                          ? "bg-surface-soft"
                          : "hover:bg-surface-soft/60"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-3 w-3 rounded-full border-2 transition-colors duration-300 ${
                          index <= active
                            ? nodeFill
                            : "border-line bg-surface"
                        }`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            index <= active ? accentText : "text-muted"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="mt-0.5 block text-lead font-bold text-foreground">
                          {step.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted">
                          {step.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>

              <div
                aria-hidden="true"
                className={`rounded-2xl border p-4 sm:p-5 ${
                  isClub
                    ? "border-line bg-surface-soft/60"
                    : "border-brand-blue/40 bg-brand-blue-soft/50"
                }`}
              >
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {steps[active].mark}
                </p>
                <div
                  key={`${mode}-${active}`}
                  className="animate-rise mt-3 flex min-h-[17rem] flex-col sm:min-h-[19rem]"
                >
                  {isClub ? (
                    <ClubSketch step={active} />
                  ) : (
                    <DistrictSketch step={active} />
                  )}
                </div>
              </div>
            </div>

            <div
              key={`${mode}-foot`}
              className={`${slideClass} flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8`}
            >
              <p className="max-w-prose text-xs text-muted">
                {copy.finePrint}
              </p>
              {isClub ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/clubs" className="cta-outline inline-flex">
                    See the club workspace
                  </Link>
                  <Link
                    href="/signup?role=coach"
                    className="text-sm font-bold text-muted-strong hover:text-brand-red"
                  >
                    Create a club account
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/districts" className="cta-outline inline-flex">
                    Review the district pilot
                  </Link>
                  <a
                    href={FOUNDING_TEAM_MEETING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Book a conversation with the Causey founding team in a new tab"
                    className="text-sm font-bold text-muted-strong hover:text-brand-red"
                  >
                    Talk with the founding team{" "}
                    <span aria-hidden="true" className="nudge-x">
                      ↗
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
