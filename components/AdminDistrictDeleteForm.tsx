"use client";

import { FormEvent, useState, useTransition } from "react";
import { adminDeleteDistrict } from "@/lib/actions/admin";
import { attemptAction } from "@/lib/attempt-action";

/** Confirmation phrase shown in the form; must match the server check. */
export function districtDeleteConfirmationPhrase(slug: string): string {
  return `DELETE ${slug}`;
}

export function AdminDistrictDeleteForm({
  districtId,
  districtSlug,
  districtName,
  schoolCount,
  onDeleted,
}: {
  districtId: string;
  districtSlug: string;
  districtName: string;
  schoolCount: number;
  onDeleted?: () => void;
}) {
  const expected = districtDeleteConfirmationPhrase(districtSlug);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const matches = confirmation === expected;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!matches) {
      setError(`Type ${expected} exactly to confirm deletion.`);
      return;
    }
    const schoolNote =
      schoolCount === 0
        ? "No schools are attached."
        : schoolCount === 1
          ? "1 school under it will also be deleted."
          : `${schoolCount} schools under it will also be deleted.`;
    if (
      !window.confirm(
        `Permanently delete district “${districtName}”? ${schoolNote} This cannot be undone.`
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await attemptAction(() =>
        adminDeleteDistrict({
          districtId,
          confirmation,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const schools = result.schoolsDeleted;
      setMessage(
        schools
          ? `Deleted ${districtName} and ${schools} ${
              schools === 1 ? "school" : "schools"
            }.`
          : `Deleted ${districtName}.`
      );
      onDeleted?.();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 border-t border-line pt-4"
    >
      <p className="text-xs font-semibold text-muted-strong">
        Delete district
      </p>
      <p className="text-xs text-muted">
        Permanently removes this district
        {schoolCount
          ? `, its ${schoolCount} ${
              schoolCount === 1 ? "school" : "schools"
            },`
          : ""}{" "}
        memberships, invitations, and hosted competitions. Type{" "}
        <span className="font-mono font-semibold text-foreground">
          {expected}
        </span>{" "}
        to confirm.
      </p>
      <label>
        <span className="sr-only">
          Type {expected} to confirm district deletion
        </span>
        <input
          className="field mt-1 font-mono"
          autoComplete="off"
          spellCheck={false}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={expected}
          disabled={isPending}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !matches}
        className="cta-enabled justify-self-start disabled:opacity-60"
      >
        {isPending ? "Deleting district…" : "Delete this district"}
      </button>
      {message ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
