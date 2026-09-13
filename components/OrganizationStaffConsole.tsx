"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrganizationAdministrator } from "@/lib/actions/district";
import { attemptAction } from "@/lib/attempt-action";
import { ORG_ROLE_LABELS } from "@/lib/auth/orgs";
import type { OrgStaffDirectoryRow } from "@/lib/data/district";

function isAdministrator(role: string) {
  return ["admin", "school_admin", "district_admin"].includes(role);
}

export function OrganizationStaffConsole({
  rows,
  currentUserId,
  showOrganization = false,
  canAssignGroups = false,
}: {
  rows: OrgStaffDirectoryRow[];
  currentUserId: string;
  showOrganization?: boolean;
  /** School admins can open Students & groups to assign coaches. */
  canAssignGroups?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeAdministrator(row: OrgStaffDirectoryRow, makeAdmin: boolean) {
    if (
      !window.confirm(
        `${makeAdmin ? "Grant" : "Remove"} ${row.org_type === "district" ? "district" : "school"} administrator access ${
          makeAdmin ? "to" : "from"
        } ${row.display_name || "this staff member"}?`
      )
    ) {
      return;
    }
    setPendingId(`${row.org_id}:${row.profile_id}`);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await attemptAction(() =>
          setOrganizationAdministrator({
            orgId: row.org_id,
            orgSlug: row.org_slug,
            profileId: row.profile_id,
            makeAdmin,
          })
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage(
          `${row.display_name || "Staff access"} updated for ${row.org_name}.`
        );
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-muted">
        No active staff accounts yet. Create a claim invitation below.
      </p>
    );
  }

  return (
    <div>
      {message ? (
        <p
          className="mb-4 rounded-xl border border-brand-red/25 bg-accent-soft px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((row) => {
          const admin = isAdministrator(row.member_role);
          const protectedRow =
            row.is_owner || row.profile_id === currentUserId;
          const rowPending =
            isPending && pendingId === `${row.org_id}:${row.profile_id}`;
          const needsGroupAssignment =
            (row.member_role === "coach" ||
              row.member_role === "assistant_coach") &&
            row.assigned_group_names.length === 0 &&
            row.org_type === "school";
          return (
            <li
              key={`${row.org_id}:${row.profile_id}`}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.display_name || "Unnamed staff"}
                  {row.profile_id === currentUserId ? " (you)" : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {ORG_ROLE_LABELS[row.member_role]}
                  {row.is_owner ? " · Primary owner" : ""}
                  {showOrganization ? ` · ${row.org_name}` : ""}
                </p>
                {row.assigned_group_names.length ? (
                  <p className="mt-1 text-xs text-muted-strong">
                    Assigned: {row.assigned_group_names.join(", ")}
                  </p>
                ) : needsGroupAssignment ? (
                  <p className="mt-1 text-xs text-muted">
                    No groups assigned
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {needsGroupAssignment && canAssignGroups ? (
                  <Link
                    href={`/orgs/${row.org_slug}/roster#groups`}
                    className="action-button"
                  >
                    Assign groups
                  </Link>
                ) : null}
                {showOrganization ? (
                  <Link
                    href={`/orgs/${row.org_slug}`}
                    className="action-button"
                  >
                    Open {row.org_type === "district" ? "district" : "school"}
                  </Link>
                ) : null}
                {admin ? (
                  protectedRow ? (
                    <span className="text-xs font-semibold text-muted">
                      {row.is_owner ? "Protected owner" : "Your access"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="action-button action-button--reversal"
                      disabled={isPending}
                      onClick={() => changeAdministrator(row, false)}
                    >
                      {rowPending ? "Updating…" : "Remove admin"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="action-button"
                    disabled={isPending}
                    onClick={() => changeAdministrator(row, true)}
                    aria-label={`Make ${row.display_name || "staff member"} an administrator for ${row.org_name}`}
                  >
                    {rowPending
                      ? "Updating…"
                      : `Make ${row.org_type === "district" ? "district" : "school"} admin`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Primary owners, your own access, and the last active administrator are
        protected. Transfer ownership explicitly when the primary owner should
        change.
      </p>
    </div>
  );
}
