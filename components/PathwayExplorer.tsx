"use client";

import { useEffect, useState } from "react";
import type { PathwayNode } from "@/lib/qualification";
import type { CompetitionRef } from "@/lib/data/types";
import type { Series } from "@/lib/schemas";
import { PathwayList } from "@/components/PathwayList";

/**
 * The differentiator demo: pick an event (or a recurring series), pick a
 * result, and see what it qualifies you for — then what those unlock, to
 * depth 3. Placement changes the answer; that's the point.
 */

type Options = { series: Series[]; competitions: CompetitionRef[] };
type Walk = { startLabel: string; placement: number; nodes: PathwayNode[] };

const PLACEMENT_CHOICES = [
  { value: 1, label: "1st place" },
  { value: 3, label: "Top 3" },
  { value: 99, label: "Participated" },
] as const;

export function PathwayExplorer() {
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [placement, setPlacement] = useState(1);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [walkState, setWalkState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pathways")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = await res.json();
        if (!cancelled) setOptions(body);
      })
      .catch(() => {
        if (!cancelled)
          setOptionsError("Couldn't load the event list. Reload the page to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!source) {
      setWalk(null);
      setWalkState("idle");
      return;
    }
    const controller = new AbortController();
    setWalkState("loading");
    fetch(`/api/pathways?source=${encodeURIComponent(source)}&placement=${placement}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = await res.json();
        setWalk(body);
        setWalkState("idle");
      })
      .catch(() => {
        if (!controller.signal.aborted) setWalkState("error");
      });
    return () => controller.abort();
  }, [source, placement]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="pathway-source" className="text-xs font-semibold text-muted-strong">
            Event or championship series
          </label>
          {optionsError ? (
            <p role="alert" className="text-sm text-error">
              {optionsError}
            </p>
          ) : (
            <select
              id="pathway-source"
              className="field"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={!options}
            >
              <option value="">
                {options ? "Choose an event or series…" : "Loading events…"}
              </option>
              {options && (
                <>
                  <optgroup label="Recurring series (rules attach here)">
                    {options.series.map((s) => (
                      <option key={s.id} value={`series:${s.id}`}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Individual events">
                    {options.competitions.map((c) => (
                      <option key={c.id} value={`competition:${c.id}`}>
                        {c.name} ({c.state})
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          )}
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-muted-strong">Your result</legend>
          <div className="mt-1.5 flex gap-2" role="radiogroup">
            {PLACEMENT_CHOICES.map((p) => {
              const selected = placement === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPlacement(p.value)}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? "bg-brand-red text-white"
                      : "border border-line bg-surface text-muted-strong hover:border-brand-red/40 hover:text-brand-red"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="max-w-prose border-t border-line pt-4 text-2xs text-muted">
          Nothing you enter here is saved — this is a lookup, not a profile.
          Rules shown are seeded scaffolding pending verification against
          official US Chess announcements; each one carries its source note
          and review date.
        </p>
      </div>

      {/* Result */}
      <div aria-live="polite">
        {walkState === "loading" && <div className="skeleton h-40" aria-label="Loading pathway" />}

        {walkState === "error" && (
          <p role="alert" className="text-sm text-error">
            Couldn&rsquo;t compute that pathway. Pick the event again or reload the
            page.
          </p>
        )}

        {walkState === "idle" && !walk && (
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-base font-semibold text-foreground">
              Pick an event to trace its pathway.
            </p>
            <p className="mt-1 max-w-prose text-sm text-muted">
              Try the North Texas Scholastic Regional with 1st place — it chains
              through the Texas Scholastic Championship to the Denker and
              beyond.
            </p>
          </div>
        )}

        {walkState === "idle" && walk && (
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {walk.placement === 99
                ? `If you play in the ${walk.startLabel}`
                : walk.placement === 1
                  ? `If you win the ${walk.startLabel}`
                  : `If you finish top ${walk.placement} at the ${walk.startLabel}`}
            </h2>
            {walk.nodes.length > 0 ? (
              <div className="mt-5">
                <PathwayList nodes={walk.nodes} />
              </div>
            ) : (
              <p className="mt-3 max-w-prose text-sm text-muted">
                {walk.placement === 99
                  ? "Playing without placing doesn't feed any qualification rule we track — invitational seats key on results. Select 1st place or top 3 to see what a strong finish opens up."
                  : walk.placement > 1
                    ? "That placement doesn't qualify for anything in our current rules — some chains need an outright win. Try 1st place to compare."
                    : "No qualification rules lead out of this event in our current data. Most tournaments are open entry; the chains start at regionals and state championships."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
