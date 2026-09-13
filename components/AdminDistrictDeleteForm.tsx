"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  adminDeleteDistrict,
  adminDeleteSchool,
} from "@/lib/actions/admin";
import {
  districtDeleteConfirmationPhrase,
  matchesOrgDeleteConfirmation,
} from "@/lib/admin-org-delete";
import { attemptAction } from "@/lib/attempt-action";

export { districtDeleteConfirmationPhrase };

export function AdminDistrictDeleteForm({
  districtId,
  districtSlug,
  districtName,
  schoolCount = 0,
  tournamentCount = 0,
  parentName = null,
  orgType = "district",
  onDeleted,
}: {
  districtId: string;
  districtSlug: string;
  districtName: string;
  schoolCount?: number;
  tournamentCount?: number;
  parentName?: string | null;
  orgType?: "district" | "school";
  onDeleted?: () => void;
}) {
  const expected = districtDeleteConfirmationPhrase(districtSlug);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const matches = matchesOrgDeleteConfirmation(confirmation, districtSlug);
  const isSchool = orgType === "school";
  const noun = isSchool ? "school" : "district";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!matches) {
      setError(`Type ${expected} to confirm deletion.`);
      return;
    }
    const extraNote = isSchool
      ? tournamentCount === 1
        ? "1 hosted competition will also be deleted."
        : tournamentCount > 1
          ? `${tournamentCount} hosted competitions will also be deleted.`
          : parentName
            ? `It is part of ${parentName}.`
            : "It is not under a district."
      : schoolCount === 0
        ? "No schools are attached."
        : schoolCount === 1
          ? "1 school under it will also be deleted."
          : `${schoolCount} schools under it will also be deleted.`;
    if (
      !window.confirm(
        `Permanently delete ${noun} “${districtName}”? ${extraNote} This cannot be undone.`
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await attemptAction(() =>
        isSchool
          ? adminDeleteSchool({
              schoolId: districtId,
              confirmation,
            })
          : adminDeleteDistrict({
              districtId,
              confirmation,
            })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if ("schoolsDeleted" in result) {
        const schools = result.schoolsDeleted;
        setMessage(
          schools
            ? `Deleted ${districtName} and ${schools} ${
                schools === 1 ? "school" : "schools"
              }.`
            : `Deleted ${districtName}.`
        );
      } else {
        const competitions = result.competitionsDeleted;
        setMessage(
          competitions
            ? `Deleted ${districtName} and ${competitions} ${
                competitions === 1 ? "competition" : "competitions"
              }.`
            : `Deleted ${districtName}.`
        );
      }
      onDeleted?.();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 border-t border-line pt-4"
    >
      <p className="text-xs font-semibold text-muted-strong">
        Delete {noun}
      </p>
      <p className="text-xs text-muted">
        {isSchool ? (
          <>
            Permanently removes this school
            {parentName ? ` from ${parentName}` : " (not under a district)"}
            {tournamentCount
              ? `, ${tournamentCount} hosted ${
                  tournamentCount === 1 ? "competition" : "competitions"
                },`
              : ""}{" "}
            memberships, and invitations.
          </>
        ) : (
          <>
            Permanently removes this district
            {schoolCount
              ? `, its ${schoolCount} ${
                  schoolCount === 1 ? "school" : "schools"
                },`
              : ""}{" "}
            memberships, invitations, and hosted competitions.
          </>
        )}{" "}
        Type{" "}
        <span className="font-mono font-semibold text-foreground">
          {expected}
        </span>{" "}
        to confirm.
      </p>
      <label>
        <span className="sr-only">
          Type {expected} to confirm {noun} deletion
        </span>
        <input
          className="field mt-1 font-mono"
          autoComplete="off"
          spellCheck={false}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError(null);
          }}
          placeholder={expected}
          disabled={isPending}
        />
      </label>
      {confirmation && !matches ? (
        <p className="text-xs text-muted">
          Type {expected} (a hyphen in the slug is enough; underscores also
          count).
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending || !matches}
        className="cta-enabled justify-self-start disabled:opacity-60"
      >
        {isPending ? `Deleting ${noun}…` : `Delete this ${noun}`}
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
