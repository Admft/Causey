"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompetitionResult } from "@/lib/data/types";
import { SEARCH_LOAD_ALL_LIMIT, type SearchSort } from "@/lib/schemas";
import { CompetitionCard } from "@/components/CompetitionCard";
import {
  ActiveFilterChips,
  SearchFilters,
  type FilterState,
} from "@/components/SearchFilters";
import {
  ResultsLayoutToggle,
  resultsGridClass,
  type ResultsLayout,
} from "@/components/ResultsLayoutToggle";
import { ChessHeroGraphic } from "@/components/ChessHeroGraphic";

/**
 * The whole search experience: zip + radius up top, filter rail, results.
 * Filter state mirrors into the URL so searches are shareable, and every
 * fetch goes through /api/competitions — the same endpoint external clients
 * would use. Tiles load in pages (default 20) so the first paint stays fast.
 *
 * Chess graphic size: edit CHESS_GRAPHIC_SCALE in ChessHeroGraphic.tsx
 */

const RADII = ["10", "25", "50", "100", "250"];
const PAGE_SIZES = [
  { value: 20, label: "20 at a time" },
  { value: 50, label: "50 at a time" },
  { value: 100, label: "100 at a time" },
  { value: "all", label: "All matching" },
] as const;
const DEFAULT_PAGE_SIZE = 20;

type PageSize = number | "all";

function resolvePageLimit(size: PageSize): number {
  return size === "all" ? SEARCH_LOAD_ALL_LIMIT : size;
}

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      results: CompetitionResult[];
      total: number;
    };

function readParams(params: URLSearchParams): {
  keyword: string;
  zip: string;
  radius: string;
  sort: SearchSort;
  filters: FilterState;
} {
  return {
    keyword: params.get("q") ?? "",
    zip: params.get("zip") ?? "",
    radius: params.get("radius") ?? "50",
    sort: params.get("sort") === "soonest" ? "soonest" : "popular",
    filters: {
      state: params.get("state") ?? "",
      source: params.get("source") ?? "",
      featured: params.get("featured") === "1",
      timing: parseTiming(params.get("timing")),
      grade_band: params.get("grade_band") ?? "",
      rating_band: params.get("rating_band") ?? "",
      max_fee_dollars: params.get("max_fee") ?? "",
      date_from: params.get("date_from") ?? "",
      date_to: params.get("date_to") ?? "",
    },
  };
}

function parseTiming(raw: string | null): FilterState["timing"] {
  if (raw === "ended" || raw === "all" || raw === "upcoming") return raw;
  return "upcoming";
}

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useMemo(() => readParams(new URLSearchParams(searchParams)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [keyword, setKeyword] = useState(initial.keyword);
  // zipInput is what's typed; zip is the validated, applied value.
  const [zipInput, setZipInput] = useState(initial.zip);
  const [zip, setZip] = useState(initial.zip);
  const [zipError, setZipError] = useState<string | null>(null);
  const [radius, setRadius] = useState(initial.radius);
  const [sort, setSort] = useState<SearchSort>(initial.sort);
  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [layout, setLayout] = useState<ResultsLayout>("grid2");

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
    if (keyword.trim()) p.set("q", keyword.trim());
    if (zip) {
      p.set("zip", zip);
      p.set("radius", radius);
    }
    if (filters.state) p.set("state", filters.state);
    if (filters.source) p.set("source", filters.source);
    if (filters.featured) p.set("featured", "1");
    if (filters.timing !== "upcoming") p.set("timing", filters.timing);
    if (filters.grade_band) p.set("grade_band", filters.grade_band);
    if (filters.rating_band) p.set("rating_band", filters.rating_band);
    if (filters.max_fee_dollars) p.set("max_fee", filters.max_fee_dollars);
    if (filters.date_from) p.set("date_from", filters.date_from);
    if (filters.date_to) p.set("date_to", filters.date_to);
    if (sort !== "popular") p.set("sort", sort);
    return p;
  }, [keyword, zip, radius, filters, sort]);

  const buildApiParams = useCallback(
    (limit: number, offset: number) => {
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
      apiParams.set("limit", String(limit));
      apiParams.set("offset", String(offset));
      return apiParams;
    },
    [query, zip, radius]
  );

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    router.replace(query.size ? `${pathname}?${query}` : pathname, { scroll: false });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "loading" });
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/competitions?${buildApiParams(resolvePageLimit(pageSize), 0)}`,
          { signal: controller.signal }
        );
        const body = await res.json();
        if (!res.ok) {
          setStatus({
            kind: "error",
            message: body.error ?? "Search failed. Reload and try again.",
          });
          return;
        }
        setStatus({
          kind: "ready",
          results: body.results ?? [],
          total: body.total ?? body.results?.length ?? 0,
        });
      } catch {
        if (controller.signal.aborted) return;
        setStatus({
          kind: "error",
          message:
            "Couldn't reach the search API. Check that the dev server is still running, then retry.",
        });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pageSize]);

  const loadMore = useCallback(async () => {
    if (status.kind !== "ready" || loadingMore) return;
    const offset = status.results.length;
    if (offset >= status.total) return;

    setLoadingMore(true);
    try {
      const chunk = resolvePageLimit(pageSize);
      const res = await fetch(`/api/competitions?${buildApiParams(chunk, offset)}`);
      const body = await res.json();
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: body.error ?? "Couldn't load more tournaments.",
        });
        return;
      }
      setStatus({
        kind: "ready",
        results: [...status.results, ...(body.results ?? [])],
        total: body.total ?? status.total,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't load more tournaments. Check the connection and try again.",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [status, loadingMore, buildApiParams, pageSize]);

  const shown = status.kind === "ready" ? status.results.length : 0;
  const total = status.kind === "ready" ? status.total : 0;
  const hasMore = status.kind === "ready" && shown < total;

  return (
    <>
      {/* Zip + radius: the one bold moment on this page, on the coordinate-
          grid motif (access shouldn't depend on where you live). */}
      <section className="access-grid section-rule">
        <div className="relative mx-auto min-h-[400px] max-w-6xl px-5 py-14 sm:px-8 sm:py-16 lg:min-h-[440px]">
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
            Chess
          </p>
          <h1 className="mt-2 max-w-[18ch] font-display text-display-lg font-bold tracking-tight text-foreground">
            Every scholastic chess tournament near you.
          </h1>
          <p className="mt-3 max-w-lg text-md text-muted">
            Enter a zip code to see what&rsquo;s in reach, with the entry fee and
            who can play shown before you commit to anything.
          </p>
          {/* One search cluster: name it, or place it. Keyword applies as you
              type; zip + radius apply on submit/blur. All three controls share
              one label treatment so the band reads as a single tool. */}
          <div className="mt-6 max-w-lg">
            <label htmlFor="tournament-search" className="text-xs font-semibold text-muted-strong">
              Tournament name
            </label>
            <input
              id="tournament-search"
              type="search"
              className="field mt-1"
              placeholder="Try World Open, state championship, or scholastic"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <form
            className="mt-2.5 flex max-w-lg flex-col gap-2.5 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              applyZip();
            }}
          >
            <div className="flex-1">
              <label htmlFor="zip" className="text-xs font-semibold text-muted-strong">
                Zip code
              </label>
              <input
                id="zip"
                className="field mt-1"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="75201"
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
              <label htmlFor="radius" className="text-xs font-semibold text-muted-strong">
                Distance
              </label>
              <select
                id="radius"
                className="field mt-1 sm:w-36"
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

          <ChessHeroGraphic />
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_1fr]">
          {/* Sticky on desktop so the rail stays in reach while scanning a
              long results column; short viewports scroll the rail internally. */}
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <SearchFilters filters={filters} onChange={setFilters} />
          </aside>

          <div aria-live="polite">
            <ActiveFilterChips filters={filters} onChange={setFilters} />

            {status.kind === "loading" && (
              <div className={resultsGridClass(layout)} aria-label="Loading results">
                {Array.from({ length: layout === "grid3" ? 9 : layout === "list" ? 5 : 6 }, (_, i) => (
                  <div
                    key={i}
                    className={`skeleton ${
                      layout === "list" ? "h-32" : layout === "grid3" ? "h-80" : "h-96"
                    }`}
                  />
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
                <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {total} tournament{total === 1 ? "" : "s"}
                      {zip ? ` within ${radius} miles of ${zip}` : " across all listed states"}
                    </p>
                    <p className="mt-0.5 max-w-prose text-sm text-muted">
                      {keyword.trim() && `Matching “${keyword.trim()}”. `}
                      {sort === "popular"
                        ? zip
                          ? "Closer 25-mile ranges first, then real save and registration interest."
                          : "Ranked by real save and registration interest."
                        : "Soonest first."}
                      {shown < total && ` Showing ${shown} so far.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ResultsLayoutToggle value={layout} onChange={setLayout} />
                    <div className="flex items-center gap-2">
                      <label htmlFor="result-sort" className="text-xs font-semibold text-muted-strong">
                        Sort
                      </label>
                      <select
                        id="result-sort"
                        className="field h-9 w-auto py-0 pr-8 text-sm"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SearchSort)}
                      >
                        <option value="popular">{zip ? "Popular nearby" : "Popular first"}</option>
                        <option value="soonest">Soonest first</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={resultsGridClass(layout)}>
                  {status.results.map((r) => (
                    <CompetitionCard key={r.id} result={r} layout={layout} />
                  ))}
                </div>
                {/* Paging lives at the bottom, where "load more" happens. The
                    count + page-size select stay visible even when everything
                    is loaded, so the choice is always recoverable. */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      Showing {shown} of {total}
                    </span>
                    <label htmlFor="page-size" className="text-xs font-semibold text-muted-strong">
                      Load
                    </label>
                    <select
                      id="page-size"
                      className="field h-9 w-auto py-0 pr-8 text-sm"
                      value={String(pageSize)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPageSize(v === "all" ? "all" : Number(v));
                      }}
                    >
                      {PAGE_SIZES.map((size) => (
                        <option key={String(size.value)} value={String(size.value)}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red disabled:cursor-wait disabled:opacity-60"
                    >
                      {loadingMore
                        ? "Loading…"
                        : pageSize === "all"
                          ? `Load remaining ${total - shown}`
                          : `Load ${Math.min(resolvePageLimit(pageSize), total - shown)} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
