"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import {
  DISCOVERY_CATEGORIES,
  discoveryCategoryHref,
  discoveryCategoryLabel,
  type DiscoveryCategory,
} from "@/lib/category-discovery";

const RADII = ["10", "25", "50", "100", "250"];

/**
 * Hero entry point for every public directory. The visitor picks a
 * competition type explicitly — there is no hidden chess default; signed-in
 * users may start from the shortcut saved on their account. Zip and radius
 * map onto the params every category search page already reads, so results
 * load in one hop.
 */
export function HomeHeroSearch({
  initialCategory = null,
}: {
  initialCategory?: DiscoveryCategory | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<DiscoveryCategory | "">(
    initialCategory ?? ""
  );
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("50");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = zipRef.current;
    if (!el) return undefined;
    const sync = () => {
      const next = el.value;
      setZip((prev) => (prev === next ? prev : next));
    };
    const t0 = window.setTimeout(sync, 0);
    const t1 = window.setTimeout(sync, 300);
    el.addEventListener("change", sync);
    el.addEventListener("input", sync);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      el.removeEventListener("change", sync);
      el.removeEventListener("input", sync);
    };
  }, []);

  function validateZip(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed && !/^\d{5}$/.test(trimmed)) {
      setZipError("Enter a 5-digit zip code, like 75201.");
      return false;
    }
    setZipError(null);
    return true;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!category) {
      setCategoryError("Choose a competition type to search.");
      categoryRef.current?.querySelector("button")?.focus();
      return;
    }
    setCategoryError(null);
    const trimmed = zip.trim();
    if (!validateZip(trimmed)) {
      zipRef.current?.focus();
      return;
    }

    setPending(true);
    // Only the params every directory understands make the trip.
    router.push(
      discoveryCategoryHref(category, {
        zip: trimmed || null,
        radius: trimmed ? radius : null,
      })
    );
  }

  const zipTrimmed = zip.trim();
  const zipComplete = /^\d{5}$/.test(zipTrimmed);

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full min-w-0 flex-col"
    >
      <p className="hidden text-sm text-muted md:mb-4 md:block">
        Pick a competition type, then optionally narrow by zip and distance.
        Each directory also has name and category-specific filters.
      </p>

      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p
            id="hero-category-label"
            className="text-xs font-semibold text-muted-strong"
          >
            Competition type
          </p>
          <div
            ref={categoryRef}
            role="radiogroup"
            aria-labelledby="hero-category-label"
            aria-invalid={categoryError !== null}
            aria-describedby={categoryError ? "hero-category-error" : undefined}
            className="mt-2 grid grid-cols-6 gap-2 md:grid-cols-5"
          >
            {DISCOVERY_CATEGORIES.map((option) => {
              const selected = category === option.id;
              const tilePlace =
                option.id === "arts"
                  ? "col-span-2 col-start-2 md:col-span-1 md:col-start-auto"
                  : "col-span-2 md:col-span-1";
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={option.label}
                  onClick={() => {
                    setCategory(option.id);
                    setCategoryError(null);
                  }}
                  className={`flex h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-1 text-center transition-colors md:h-16 ${tilePlace} ${
                    selected
                      ? "border-brand-red/45 bg-accent-soft text-brand-red"
                      : "border-line bg-white text-foreground hover:border-brand-red/35 hover:text-brand-red"
                  }`}
                >
                  <CategoryGlyph
                    category={option.id}
                    className="h-5 w-5 shrink-0 md:h-7 md:w-7"
                  />
                  <span className="max-w-full text-2xs font-bold leading-tight">
                    {option.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
          {categoryError ? (
            <p
              id="hero-category-error"
              role="alert"
              className="mt-1 text-2xs text-error"
            >
              {categoryError}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="hero-zip"
              className="text-xs font-semibold text-muted-strong"
            >
              Zip code
            </label>
            <input
              id="hero-zip"
              ref={zipRef}
              className="field mt-1"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="Optional"
              value={zip}
              onChange={(event) => setZip(event.target.value)}
              onBlur={(event) => validateZip(event.target.value)}
              aria-invalid={zipError !== null}
              aria-describedby={zipError ? "hero-zip-error" : undefined}
            />
            {zipError ? (
              <p id="hero-zip-error" role="alert" className="mt-1 text-2xs text-error">
                {zipError}
              </p>
            ) : null}
          </div>
          <div
            className={`min-w-0 ${zipTrimmed ? "" : "max-md:hidden"}`}
          >
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
      </div>

      <div className="mt-4 md:mt-5">
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled w-full touch-manipulation disabled:opacity-60"
        >
          {pending ? "Searching…" : "Search tournaments"}
        </button>

        {category && !zipTrimmed ? (
          <p className="mt-3 text-2xs text-muted">
            <Link
              href={discoveryCategoryHref(category)}
              className="font-semibold text-brand-red hover:underline"
            >
              Browse {discoveryCategoryLabel(category)} without a zip
            </Link>
          </p>
        ) : zipTrimmed && category && !zipComplete ? (
          <p className="mt-3 text-2xs text-muted">
            Enter a 5-digit zip, or clear the field to browse without one.
          </p>
        ) : !category ? (
          <p className="mt-3 hidden text-2xs text-muted md:block">
            Every directory lists the official sources it indexes, including the
            ones still link-only.
          </p>
        ) : null}
      </div>
    </form>
  );
}
