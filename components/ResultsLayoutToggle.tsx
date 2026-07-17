/**
 * Layout density for search results. Icon buttons (not pills) — each mode
 * changes how many columns / how dense the cards are.
 */
import type { ReactNode } from "react";

export type ResultsLayout = "list" | "grid2" | "grid3";

const MODES: {
  id: ResultsLayout;
  label: string;
  icon: ReactNode;
}[] = [
  {
    id: "list",
    label: "List view",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "grid2",
    label: "2 by 2 grid",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "grid3",
    label: "3 by 3 grid",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="6.25" y="1.5" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="1.5" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1.5" y="6.25" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="6.25" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1.5" y="11" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="6.25" y="11" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="11" width="3.5" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
];

export function ResultsLayoutToggle({
  value,
  onChange,
}: {
  value: ResultsLayout;
  onChange: (next: ResultsLayout) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Result layout"
      className="hidden items-center gap-1 rounded-lg border border-line bg-white p-1 lg:inline-flex"
    >
      {MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={active}
            aria-label={mode.label}
            title={mode.label}
            onClick={() => onChange(mode.id)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-accent-soft text-brand-red"
                : "text-muted-strong hover:bg-surface-soft hover:text-foreground"
            }`}
          >
            {mode.icon}
          </button>
        );
      })}
    </div>
  );
}

export function resultsGridClass(layout: ResultsLayout): string {
  switch (layout) {
    case "list":
      return "grid grid-cols-1 gap-3";
    case "grid3":
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
    case "grid2":
    default:
      return "grid grid-cols-1 gap-5 md:grid-cols-2";
  }
}
