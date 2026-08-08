"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const RADII = ["10", "25", "50", "100", "250"];

/**
 * Hero entry point. Chess search is the only finished surface, so the hero
 * hands the visitor straight to it instead of describing it — the zip and
 * radius map onto the params /chess already reads, so results load in one hop.
 */
export function HomeHeroSearch() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed && !/^\d{5}$/.test(trimmed)) {
      setError("Enter a 5-digit zip code, like 75201.");
      return false;
    }
    setError(null);
    return true;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = zip.trim();
    if (!validate(trimmed)) return;

    setPending(true);
    const params = new URLSearchParams();
    if (trimmed) {
      params.set("zip", trimmed);
      params.set("radius", radius);
    }
    router.push(params.size ? `/chess?${params}` : "/chess");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <h2 className="font-display text-display-sm font-bold tracking-tight text-foreground">
        Find chess tournaments
      </h2>
      <p className="mt-2 text-sm text-muted">
        Entry fees and section eligibility are shown before you commit to
        anything.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <div className="min-w-0">
          <label
            htmlFor="hero-zip"
            className="text-xs font-semibold text-muted-strong"
          >
            Zip code
          </label>
          <input
            id="hero-zip"
            className="field mt-1"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="75201"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            onBlur={(event) => validate(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? "hero-zip-error" : undefined}
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor="hero-radius"
            className="text-xs font-semibold text-muted-strong"
          >
            Distance
          </label>
          <select
            id="hero-radius"
            className="field mt-1 w-full"
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          >
            {RADII.map((value) => (
              <option key={value} value={value}>
                within {value} mi
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p id="hero-zip-error" role="alert" className="mt-2 text-2xs text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cta-enabled mt-5 w-full disabled:opacity-60"
      >
        {pending ? "Searching…" : "Search tournaments"}
      </button>

      <p className="mt-4 text-2xs text-muted">
        Indexed from US Chess, Continental Chess, OnlineRegistration.cc,
        Chess-Results, FIDE, and Texas Chess Association listings.{" "}
        <Link href="/chess" className="font-semibold text-brand-red hover:underline">
          Browse without a zip
        </Link>
      </p>
    </form>
  );
}
