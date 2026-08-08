"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminBulkVerifyDistrictSchools } from "@/lib/actions/admin";

export function AdminDistrictSchoolBulkVerify({
  districtId,
  districtSlug,
  districtName,
  schools,
}: {
  districtId: string;
  districtSlug: string;
  districtName: string;
  schools: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!schools.length) return null;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((schoolId) => schoolId !== id)
        : [...current, id]
    );
  }

  function verifySelected() {
    if (!selected.length) return;
    if (
      !window.confirm(
        `Verify ${selected.length} selected ${
          selected.length === 1 ? "school" : "schools"
        } under ${districtName}?`
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminBulkVerifyDistrictSchools({
        districtId,
        districtSlug,
        schoolIds: selected,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected([]);
      setMessage(
        `${result.verified} ${
          result.verified === 1 ? "school" : "schools"
        } verified.`
      );
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-l-2 border-line pl-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-muted-strong">
          Pending schools in this district
        </p>
        <button
          type="button"
          onClick={() =>
            setSelected(
              selected.length === schools.length
                ? []
                : schools.map((school) => school.id)
            )
          }
          className="text-xs font-semibold text-muted-strong hover:text-brand-red"
        >
          {selected.length === schools.length ? "Clear selection" : "Select all"}
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {schools.map((school) => (
          <label
            key={school.id}
            className="flex cursor-pointer items-center gap-3 text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={selected.includes(school.id)}
              onChange={() => toggle(school.id)}
              className="size-4 accent-[var(--brand-red)]"
            />
            <span>{school.name}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!selected.length || pending}
        onClick={verifySelected}
        className="cta-enabled mt-4 disabled:opacity-60"
      >
        {pending
          ? "Verifying…"
          : `Verify selected${selected.length ? ` (${selected.length})` : ""}`}
      </button>
      {message ? (
        <p className="mt-3 text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
