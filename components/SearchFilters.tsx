"use client";

import { GRADE_BANDS, RATING_BANDS } from "@/lib/schemas";
import { INGESTION_SOURCES } from "@/lib/ingestion-sources";
import { FeaturedAwardMark } from "@/components/FeaturedAwardMark";

/**
 * Filter sidebar for the search page. Controlled component — state lives in
 * SearchClient so filters, URL, and results never drift apart.
 */

export interface FilterState {
  state: string;
  source: string;
  featured: boolean;
  grade_band: string;
  rating_band: string;
  max_fee_dollars: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: FilterState = {
  state: "",
  source: "",
  featured: false,
  grade_band: "",
  rating_band: "",
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

/** Live scrape hubs + manual seed rows — values match competitions.source. */
const SOURCE_OPTIONS = [
  ...INGESTION_SOURCES.filter((s) => s.competitionSource).map((s) => ({
    value: s.competitionSource as string,
    label: s.name,
  })),
  { value: "manual", label: "Hand-entered / seed" },
];

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
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
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const set = (key: keyof FilterState) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  const active =
    filters.featured ||
    Object.entries(filters).some(([key, v]) => key !== "featured" && v !== "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Narrow it down</h2>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs font-medium text-muted-strong transition-colors hover:text-brand-red"
          >
            Clear filters
          </button>
        )}
      </div>

      <button
        type="button"
        aria-pressed={filters.featured}
        onClick={() => onChange({ ...filters, featured: !filters.featured })}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
          filters.featured
            ? "border-brand-red/40 bg-accent-soft text-brand-red"
            : "border-line bg-white text-muted-strong hover:border-brand-red/40 hover:text-brand-red"
        }`}
      >
        <FeaturedAwardMark className="h-4 w-4" />
        Featured only
      </button>

      <Field id="filter-source" label="Data source">
        <select id="filter-source" className="field" value={filters.source} onChange={set("source")}>
          <option value="">All sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="filter-grade" label="Grade">
        <select id="filter-grade" className="field" value={filters.grade_band} onChange={set("grade_band")}>
          <option value="">Any grade</option>
          {Object.entries(GRADE_BANDS).map(([value, band]) => (
            <option key={value} value={value}>
              {band.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="filter-rating" label="Rating">
        <select id="filter-rating" className="field" value={filters.rating_band} onChange={set("rating_band")}>
          <option value="">Any rating</option>
          {Object.entries(RATING_BANDS).map(([value, band]) => (
            <option key={value} value={value}>
              {band.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="filter-fee" label="Entry fee">
        <select id="filter-fee" className="field" value={filters.max_fee_dollars} onChange={set("max_fee_dollars")}>
          <option value="">Any fee</option>
          {FEE_CEILINGS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="filter-state" label="State">
        <select id="filter-state" className="field" value={filters.state} onChange={set("state")}>
          <option value="">All states</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field id="filter-from" label="From date">
        <input
          id="filter-from"
          type="date"
          className="field"
          value={filters.date_from}
          onChange={set("date_from")}
        />
      </Field>

      <Field id="filter-to" label="To date">
        <input
          id="filter-to"
          type="date"
          className="field"
          value={filters.date_to}
          onChange={set("date_to")}
        />
      </Field>
    </div>
  );
}
