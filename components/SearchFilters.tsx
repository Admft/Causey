"use client";

import { useState } from "react";
import {
  GRADE_BANDS,
  RATING_BANDS,
  type CompetitionCategory,
  type GradeBand,
  type RatingBand,
} from "@/lib/schemas";
import { competitionSourceOptionsForCategory } from "@/lib/ingestion-sources";
import { discoveryCategory } from "@/lib/category-discovery";
import { formatDate } from "@/lib/format";
import { FeaturedAwardMark } from "@/components/FeaturedAwardMark";
import type { TimingFilter } from "@/lib/competition-timing";

/**
 * Filter sidebar for the search page. Controlled component — state lives in
 * SearchClient so filters, URL, and results never drift apart.
 * Below lg the rail sits above the results, so it collapses into a
 * disclosure; otherwise a phone user scrolls a full screen of fields
 * before the first tournament.
 */

export interface FilterState {
  state: string;
  source: string;
  featured: boolean;
  /** Default upcoming — ended events are hidden until you ask for them. */
  timing: TimingFilter;
  grade_band: string;
  rating_band: string;
  facet: string;
  max_fee_dollars: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: FilterState = {
  state: "",
  source: "",
  featured: false,
  timing: "upcoming",
  grade_band: "",
  rating_band: "",
  facet: "",
  max_fee_dollars: "",
  date_from: "",
  date_to: "",
};

// States with seeded events. Swap for a full state list once live data
// covers more of the country.
const STATES = ["AZ", "CA", "FL", "IL", "MO", "NJ", "NY", "TX"];
const FEE_CEILINGS = [
  { value: "25", label: "$25 or less" },
  { value: "40", label: "$40 or less" },
  { value: "60", label: "$60 or less" },
  { value: "100", label: "$100 or less" },
];

const TIMING_OPTIONS: { value: TimingFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ended", label: "Ended" },
  { value: "all", label: "Both" },
];

function Field({
  id,
  label,
  className = "",
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-strong">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SearchFilters({
  filters,
  onChange,
  category = "chess",
  idPrefix = "filter",
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  category?: CompetitionCategory;
  idPrefix?: string;
}) {
  const set = (key: keyof FilterState) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  const [open, setOpen] = useState(false);
  const id = (name: string) => `${idPrefix}-${name}`;
  const categoryDefinition = discoveryCategory(category);
  const sourceOptions = competitionSourceOptionsForCategory(category);

  const activeCount =
    (filters.featured ? 1 : 0) +
    (filters.timing !== "upcoming" ? 1 : 0) +
    Object.entries(filters).filter(
      ([key, v]) => key !== "featured" && key !== "timing" && v !== ""
    ).length;
  const active = activeCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 lg:items-baseline lg:justify-between">
        {/* Below lg the rail stacks above results, so the heading becomes a
            disclosure toggle; the count keeps active filters visible when
            collapsed. Desktop keeps the plain heading + always-open panel. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id("panel")}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 flex-1 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 lg:hidden"
        >
          <span>
            Narrow it down
            {active ? (
              <span className="font-medium text-muted"> · {activeCount} applied</span>
            ) : null}
          </span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="hidden text-sm font-semibold text-foreground lg:block">
          Narrow it down
        </h2>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="shrink-0 text-xs font-medium text-muted-strong transition-colors hover:text-brand-red"
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        id={id("panel")}
        className={`grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-4 ${
          open ? "grid" : "hidden lg:flex"
        }`}
      >
      <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
        <p className="text-xs font-semibold text-muted-strong" id={id("timing-label")}>
          When
        </p>
        <div
          role="group"
          aria-labelledby={id("timing-label")}
          className="flex rounded-lg border border-line bg-surface-soft p-1"
        >
          {TIMING_OPTIONS.map((opt) => {
            const selected = filters.timing === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...filters, timing: opt.value })}
                className={`flex flex-1 items-center justify-center rounded-md px-1.5 py-1.5 text-xs font-semibold leading-none transition-colors ${
                  selected
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-strong hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {category === "chess" ? (
        <button
          type="button"
          aria-pressed={filters.featured}
          onClick={() => onChange({ ...filters, featured: !filters.featured })}
          className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors lg:col-span-1 ${
            filters.featured
              ? "border-brand-red/40 bg-accent-soft text-brand-red"
              : "border-line bg-white text-muted-strong hover:border-brand-red/40 hover:text-brand-red"
          }`}
        >
          <FeaturedAwardMark className="h-5 w-5" />
          Featured only
        </button>
      ) : null}

      <Field id={id("source")} label="Listing source" className="col-span-2 lg:col-span-1">
        <select id={id("source")} className="field" value={filters.source} onChange={set("source")}>
          <option value="">Any source</option>
          {sourceOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      {categoryDefinition?.facetLabel ? (
        <Field id={id("facet")} label={categoryDefinition.facetLabel}>
          <select
            id={id("facet")}
            className="field"
            value={filters.facet}
            onChange={set("facet")}
          >
            <option value="">Any {categoryDefinition.facetLabel.toLowerCase()}</option>
            {categoryDefinition.facets.map((facet) => (
              <option key={facet.value} value={facet.value}>
                {facet.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field id={id("grade")} label="Grade">
        <select id={id("grade")} className="field" value={filters.grade_band} onChange={set("grade_band")}>
          <option value="">Any grade</option>
          {Object.entries(GRADE_BANDS).map(([value, band]) => (
            <option key={value} value={value}>
              {band.label}
            </option>
          ))}
        </select>
      </Field>

      {category === "chess" ? (
        <Field id={id("rating")} label="Rating">
          <select id={id("rating")} className="field" value={filters.rating_band} onChange={set("rating_band")}>
            <option value="">Any rating</option>
            {Object.entries(RATING_BANDS).map(([value, band]) => (
              <option key={value} value={value}>
                {band.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field id={id("fee")} label="Entry fee">
        <select id={id("fee")} className="field" value={filters.max_fee_dollars} onChange={set("max_fee_dollars")}>
          <option value="">Any fee</option>
          {FEE_CEILINGS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id={id("state")} label="State">
        <select id={id("state")} className="field" value={filters.state} onChange={set("state")}>
          <option value="">All states</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field id={id("from")} label="From date">
        <input
          id={id("from")}
          type="date"
          className="field"
          value={filters.date_from}
          onChange={set("date_from")}
        />
      </Field>

      <Field id={id("to")} label="To date">
        <input
          id={id("to")}
          type="date"
          className="field"
          value={filters.date_to}
          onChange={set("date_to")}
        />
      </Field>
      </div>
    </div>
  );
}

/**
 * Applied rail filters restated as removable chips at the top of the results
 * column, so results + filters read as one system: the rail sets constraints,
 * and the results view always names what it's showing — even when the rail is
 * scrolled away on desktop or collapsed behind the disclosure on phones.
 * Every chip is a button: one click removes that one constraint.
 */

type Chip = { key: keyof FilterState; label: string; value: string };

function activeChips(
  filters: FilterState,
  category: CompetitionCategory
): Chip[] {
  const chips: Chip[] = [];
  if (filters.timing === "ended") {
    chips.push({ key: "timing", label: "Ended only", value: "upcoming" });
  } else if (filters.timing === "all") {
    chips.push({ key: "timing", label: "Including ended", value: "upcoming" });
  }
  if (filters.featured) {
    chips.push({ key: "featured", label: "Featured only", value: "" });
  }
  const source = competitionSourceOptionsForCategory(category).find(
    (s) => s.value === filters.source
  );
  if (source) {
    chips.push({ key: "source", label: `Source: ${source.label}`, value: "" });
  }
  const grade = GRADE_BANDS[filters.grade_band as GradeBand];
  if (grade) {
    chips.push({ key: "grade_band", label: `Grade: ${grade.label}`, value: "" });
  }
  const rating = RATING_BANDS[filters.rating_band as RatingBand];
  if (rating) {
    chips.push({ key: "rating_band", label: `Rating: ${rating.label}`, value: "" });
  }
  const facet = discoveryCategory(category)?.facets.find(
    (option) => option.value === filters.facet
  );
  if (facet) {
    chips.push({ key: "facet", label: facet.label, value: "" });
  }
  const fee = FEE_CEILINGS.find((f) => f.value === filters.max_fee_dollars);
  if (fee) {
    chips.push({ key: "max_fee_dollars", label: `Fee: ${fee.label}`, value: "" });
  }
  if (filters.state) {
    chips.push({ key: "state", label: `State: ${filters.state}`, value: "" });
  }
  if (filters.date_from) {
    chips.push({
      key: "date_from",
      label: `From ${formatDate(filters.date_from)}`,
      value: "",
    });
  }
  if (filters.date_to) {
    chips.push({
      key: "date_to",
      label: `By ${formatDate(filters.date_to)}`,
      value: "",
    });
  }
  return chips;
}

export function ActiveFilterChips({
  filters,
  onChange,
  category = "chess",
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  category?: CompetitionCategory;
}) {
  const chips = activeChips(filters, category);
  if (chips.length === 0) return null;

  const remove = (chip: Chip) =>
    onChange({ ...filters, [chip.key]: chip.value } as FilterState);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
        Filtered by
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => remove(chip)}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red"
        >
          {chip.label}
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="text-xs font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        Clear all
      </button>
    </div>
  );
}
