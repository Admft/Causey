"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompetitionResult } from "@/lib/data/types";
import { CompetitionCard } from "@/components/CompetitionCard";
import { EMPTY_FILTERS, SearchFilters, type FilterState } from "@/components/SearchFilters";

/**
 * The whole search experience: zip + radius up top, filter rail, results.
 * Filter state mirrors into the URL so searches are shareable, and every
 * fetch goes through /api/competitions — the same endpoint external clients
 * would use.
 */

const RADII = ["10", "25", "50", "100", "250"];

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; results: CompetitionResult[] };

function readParams(params: URLSearchParams): { zip: string; radius: string; filters: FilterState } {
  return {
    zip: params.get("zip") ?? "",
    radius: params.get("radius") ?? "50",
    filters: {
      state: params.get("state") ?? "",
      grade_band: params.get("grade_band") ?? "",
      rating_band: params.get("rating_band") ?? "",
      max_fee_dollars: params.get("max_fee") ?? "",
      date_from: params.get("date_from") ?? "",
      date_to: params.get("date_to") ?? "",
    },
  };
}

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useMemo(() => readParams(new URLSearchParams(searchParams)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // zipInput is what's typed; zip is the validated, applied value.
  const [zipInput, setZipInput] = useState(initial.zip);
  const [zip, setZip] = useState(initial.zip);
  const [zipError, setZipError] = useState<string | null>(null);
  const [radius, setRadius] = useState(initial.radius);
  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  const applyZip = useCallback(() => {
    const trimmed = zipInput.trim();
    if (trimmed === "") {
      setZipError(null);
      setZip("");
      return;
    }
    if (!/^\d{5}$/.test(trimmed)) {
      setZipError("Enter a 5-digit zip code, like 75201.");
      return;
    }
    setZipError(null);
    setZip(trimmed);
  }, [zipInput]);

  // One place builds the query — URL bar and API always agree.
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (zip) {
      p.set("zip", zip);
      p.set("radius", radius);
    }
    if (filters.state) p.set("state", filters.state);
    if (filters.grade_band) p.set("grade_band", filters.grade_band);
    if (filters.rating_band) p.set("rating_band", filters.rating_band);
    if (filters.max_fee_dollars) p.set("max_fee", filters.max_fee_dollars);
    if (filters.date_from) p.set("date_from", filters.date_from);
    if (filters.date_to) p.set("date_to", filters.date_to);
    return p;
  }, [zip, radius, filters]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    router.replace(query.size ? `${pathname}?${query}` : pathname, { scroll: false });

    const apiParams = new URLSearchParams(query);
    if (zip) {
      apiParams.set("radius_miles", radius);
      apiParams.delete("radius");
    }
    const fee = apiParams.get("max_fee");
    if (fee) {
      apiParams.set("max_fee_cents", String(Number(fee) * 100));
      apiParams.delete("max_fee");
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "loading" });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/competitions?${apiParams}`, { signal: controller.signal });
        const body = await res.json();
        if (!res.ok) {
          setStatus({ kind: "error", message: body.error ?? "Search failed. Reload and try again." });
          return;
        }
        setStatus({ kind: "ready", results: body.results });
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus({
          kind: "error",
          message: "Couldn't reach the search API. Check that the dev server is still running, then retry.",
        });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <>
      {/* Zip + radius: the one bold moment on this page, on the coordinate-
          grid motif (access shouldn't depend on where you live). */}
      <section className="access-grid section-rule">
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h1 className="max-w-[18ch] font-display text-display-lg font-bold tracking-tight text-foreground">
            Every scholastic chess tournament near you.
          </h1>
          <p className="mt-3 max-w-lg text-md text-muted">
            Enter a zip code to see what&rsquo;s in reach, with the entry fee and
            who can play shown before you commit to anything.
          </p>
          <form
            className="mt-6 flex max-w-lg flex-col gap-2.5 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              applyZip();
            }}
          >
            <div className="flex-1">
              <label htmlFor="zip" className="sr-only">
                Zip code
              </label>
              <input
                id="zip"
                className="field"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="Zip code — try 75201"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                onBlur={applyZip}
                aria-invalid={zipError !== null}
                aria-describedby={zipError ? "zip-error" : undefined}
              />
              {zipError && (
                <p id="zip-error" role="alert" className="mt-1 text-2xs text-error">
                  {zipError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="radius" className="sr-only">
                Search radius
              </label>
              <select
                id="radius"
                className="field sm:w-36"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    within {r} mi
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="cta-enabled">
              Search tournaments
            </button>
          </form>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_1fr]">
          <aside>
            <SearchFilters filters={filters} onChange={setFilters} />
          </aside>

          <div aria-live="polite">
            {status.kind === "loading" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Loading results">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton h-36" />
                ))}
              </div>
            )}

            {status.kind === "error" && (
              <div className="rounded-xl border border-line bg-surface p-5">
                <p className="text-base font-semibold text-foreground">
                  We couldn&rsquo;t run that search.
                </p>
                <p role="alert" className="mt-1 max-w-prose text-sm text-error">
                  {status.message}
                </p>
              </div>
            )}

            {status.kind === "ready" && status.results.length === 0 && (
              <div className="rounded-xl border border-line bg-surface p-5">
                <p className="text-base font-semibold text-foreground">
                  No tournaments match{zip && ` within ${radius} miles of ${zip}`}.
                </p>
                <p className="mt-1 max-w-prose text-sm text-muted">
                  Try widening the radius, raising the fee ceiling, or clearing a
                  filter — state championships especially may be further out but
                  are where qualification pathways start.
                </p>
              </div>
            )}

            {status.kind === "ready" && status.results.length > 0 && (
              <>
                <p className="mb-4 text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {status.results.length} tournament{status.results.length === 1 ? "" : "s"}
                  </span>
                  {zip ? ` within ${radius} miles of ${zip}` : " across all seeded states"}
                  , soonest and closest first.
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {status.results.map((r) => (
                    <CompetitionCard key={r.id} result={r} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
