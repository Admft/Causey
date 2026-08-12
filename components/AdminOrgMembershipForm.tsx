"use client";

import { FormEvent, useState, useTransition } from "react";
import { adminUpsertOrgMembership } from "@/lib/actions/admin";

const ROLE_OPTIONS = [
  { value: "coach", label: "Coach" },
  { value: "assistant_coach", label: "Assistant coach" },
  { value: "school_admin", label: "School administrator" },
  { value: "district_admin", label: "District administrator" },
  { value: "admin", label: "Admin (legacy)" },
  { value: "student", label: "Student" },
] as const;

export function AdminOrgMembershipForm({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [orgSlug, setOrgSlug] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("coach");
  const [status, setStatus] = useState<"active" | "removed">("active");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !window.confirm(
        status === "removed"
          ? `Remove ${displayName || "this account"} from organization “${orgSlug.trim()}”?`
          : `Grant ${role.replaceAll("_", " ")} access on “${orgSlug.trim()}” to ${
              displayName || "this account"
            }?`
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminUpsertOrgMembership({
        profileId,
        orgSlug,
        role,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.status === "removed"
          ? `Removed membership on ${result.orgName}.`
          : `Saved ${result.role.replaceAll("_", " ")} on ${result.orgName}. Open /orgs/${result.orgSlug}/people to continue.`
      );
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 border-t border-line pt-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Organization membership
        </h3>
        <p className="mt-1 text-xs text-muted">
          Grant or repair workspace access when a claim link is blocked. Use the
          organization slug from Admin → Organizations.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-xs font-semibold text-muted-strong">
            Organization slug
          </span>
          <input
            className="field mt-1"
            value={orgSlug}
            onChange={(event) => setOrgSlug(event.target.value)}
            placeholder="lincoln-middle-school"
            required
            disabled={isPending}
            autoComplete="off"
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Role</span>
          <select
            className="field mt-1"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as (typeof ROLE_OPTIONS)[number]["value"])
            }
            disabled={isPending}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--brand-red)]"
          checked={status === "removed"}
          onChange={(event) =>
            setStatus(event.target.checked ? "removed" : "active")
          }
          disabled={isPending}
        />
        <span className="text-sm text-muted-strong">
          Mark membership removed instead of active
        </span>
      </label>
      <button
        type="submit"
        disabled={isPending || !orgSlug.trim()}
        className="cta-enabled justify-self-start disabled:opacity-60"
      >
        {isPending ? "Saving membership…" : "Save membership"}
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
