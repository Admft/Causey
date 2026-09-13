"use client";

import { useState, useTransition } from "react";
import { adminSearchOrganizationScopes } from "@/lib/actions/admin";
import { attemptAction } from "@/lib/attempt-action";
import type { AdminOrganizationScope } from "@/lib/data/admin";

function scopeLabel(scope: AdminOrganizationScope): string {
  const context = [
    scope.type === "school" ? "School" : scope.type[0].toUpperCase() + scope.type.slice(1),
    scope.state,
    scope.parent_name ? `part of ${scope.parent_name}` : null,
  ].filter(Boolean);
  return context.join(" · ");
}

function ScopeField({
  kind,
  name,
  label,
  placeholder,
  initialValue,
}: {
  kind: "all" | "district";
  name: "org" | "district";
  label: string;
  placeholder: string;
  initialValue: AdminOrganizationScope | null;
}) {
  const [selected, setSelected] = useState(initialValue);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminOrganizationScope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function search() {
    setError(null);
    startTransition(async () => {
      const result = await attemptAction(() =>
        adminSearchOrganizationScopes({ query: query.trim(), kind })
      );
      setSearched(true);
      if (!result.ok) {
        setResults([]);
        setError(result.error);
        return;
      }
      setResults(result.scopes);
    });
  }

  return (
    <div>
      <span className="text-xs font-semibold text-muted-strong">{label}</span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="mt-1 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-field-border bg-field px-4 py-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {selected.name}
            </span>
            <span className="block truncate text-xs text-muted">
              {scopeLabel(selected)}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-muted-strong hover:text-brand-red"
            onClick={() => {
              setSelected(null);
              setResults([]);
              setSearched(false);
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <span className="mt-1 flex gap-2">
            <input
              className="field min-w-0 flex-1"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                search();
              }}
              placeholder={placeholder}
              maxLength={100}
              autoComplete="off"
            />
            <button
              type="button"
              className="action-button shrink-0"
              onClick={search}
              disabled={isPending}
            >
              {isPending ? "Finding…" : "Find"}
            </button>
          </span>
          {error ? (
            <p className="mt-2 text-xs font-semibold text-brand-red" role="alert">
              {error}
            </p>
          ) : results.length ? (
            <ul className="mt-2 max-h-52 divide-y divide-line overflow-y-auto border-y border-line">
              {results.map((scope) => (
                <li key={scope.id}>
                  <button
                    type="button"
                    className="w-full px-1 py-2 text-left hover:bg-surface-soft"
                    onClick={() => {
                      setSelected(scope);
                      setResults([]);
                      setSearched(false);
                    }}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {scope.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {scopeLabel(scope)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : searched && !isPending ? (
            <p className="mt-2 text-xs text-muted">
              No matching {kind === "district" ? "districts" : "organizations"}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AdminUserScopePicker({
  initialDistrict,
  initialOrganization,
}: {
  initialDistrict: AdminOrganizationScope | null;
  initialOrganization: AdminOrganizationScope | null;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ScopeField
        kind="district"
        name="district"
        label="District scope"
        placeholder="Search district name"
        initialValue={initialDistrict}
      />
      <ScopeField
        kind="all"
        name="org"
        label="Exact organization"
        placeholder="Search school, club, team, or district"
        initialValue={initialOrganization}
      />
    </div>
  );
}
