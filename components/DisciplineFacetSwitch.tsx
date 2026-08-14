"use client";

import type { FilterState } from "@/components/SearchFilters";
import {
  childFacetsFor,
  discoveryCategory,
  primaryFacetsForCategory,
  type DiscoveryCategory,
} from "@/lib/category-discovery";

function chipClass(active: boolean) {
  return active
    ? "inline-flex shrink-0 items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm"
    : "inline-flex shrink-0 items-center rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted-strong transition-colors hover:text-foreground";
}

export function DisciplineFacetSwitch({
  category,
  filters,
  onChange,
}: {
  category: DiscoveryCategory;
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const definition = discoveryCategory(category);
  const primaries = primaryFacetsForCategory(category);
  if (!definition?.facetLabel || primaries.length === 0) return null;

  const selected = filters.facet;
  const selectedPrimary =
    primaries.find((facet) => facet.value === selected)?.value ??
    primaries.find((facet) =>
      childFacetsFor(category, facet.value).some((child) => child.value === selected)
    )?.value ??
    "";
  const children = selectedPrimary
    ? childFacetsFor(category, selectedPrimary)
    : [];

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div>
        <p className="text-xs font-semibold text-muted-strong" id="discipline-facet-label">
          {definition.facetLabel}
        </p>
        <div
          role="group"
          aria-labelledby="discipline-facet-label"
          className="mt-1.5 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface-soft p-1"
        >
          <button
            type="button"
            aria-pressed={!selected}
            className={chipClass(!selected)}
            onClick={() => onChange({ ...filters, facet: "" })}
          >
            All
          </button>
          {primaries.map((facet) => {
            const active = selectedPrimary === facet.value;
            return (
              <button
                key={facet.value}
                type="button"
                aria-pressed={active}
                className={chipClass(active)}
                onClick={() => onChange({ ...filters, facet: facet.value })}
              >
                {facet.label}
              </button>
            );
          })}
        </div>
      </div>
      {children.length > 0 ? (
        <div>
          <p
            className="text-xs font-semibold text-muted-strong"
            id="math-type-facet-label"
          >
            Type of math
          </p>
          <div
            role="group"
            aria-labelledby="math-type-facet-label"
            className="mt-1.5 flex gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1"
          >
            <button
              type="button"
              aria-pressed={selected === selectedPrimary}
              className={chipClass(selected === selectedPrimary)}
              onClick={() => onChange({ ...filters, facet: selectedPrimary })}
            >
              All math types
            </button>
            {children.map((facet) => {
              const active = selected === facet.value;
              return (
                <button
                  key={facet.value}
                  type="button"
                  aria-pressed={active}
                  className={chipClass(active)}
                  onClick={() => onChange({ ...filters, facet: facet.value })}
                >
                  {facet.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
