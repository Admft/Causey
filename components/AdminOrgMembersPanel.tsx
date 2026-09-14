"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { adminSearchOrgMembers } from "@/lib/actions/admin";
import { PageBackButton, PageNextButton } from "@/components/PageBackLink";
import type {
  AdminOrgMemberRoleFilter,
  AdminOrgMemberRow,
} from "@/lib/data/admin";
import { attemptAction } from "@/lib/attempt-action";

const PAGE_SIZE = 25;

const ROLE_LABELS: Record<AdminOrgMemberRow["membership_role"], string> = {
  admin: "Organization admin",
  district_admin: "District administrator",
  school_admin: "School administrator",
  coach: "Coach",
  assistant_coach: "Assistant coach",
  student: "Student",
};

function formatJoinedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function contactLine(member: AdminOrgMemberRow): string {
  const parts = [
    member.email || "No email",
    ROLE_LABELS[member.membership_role],
  ];
  if (member.membership_status === "invited") {
    parts.push("invite pending");
  }
  return parts.join(" · ");
}

export function AdminOrgMembersPanel({
  orgId,
  memberCount,
}: {
  orgId: string;
  memberCount: number;
}) {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [role, setRole] = useState<AdminOrgMemberRoleFilter>("all");
  const [appliedRole, setAppliedRole] =
    useState<AdminOrgMemberRoleFilter>("all");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<AdminOrgMemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingSource, setPendingSource] = useState<"search" | "page" | null>(
    null
  );

  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const hasPrevious = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  function search(
    nextPage: number,
    nextQuery = appliedQuery,
    nextRole = appliedRole,
    source: "search" | "page" = "page"
  ) {
    setError(null);
    setPendingSource(source);
    startTransition(async () => {
      const result = await attemptAction(() =>
        adminSearchOrgMembers({
          orgId,
          query: nextQuery,
          page: nextPage,
          role: nextRole,
        })
      );
      if (!result.ok) {
        setMembers([]);
        setTotal(0);
        setError(result.error);
        setLoaded(true);
        setPendingSource(null);
        return;
      }
      setMembers(result.members);
      setTotal(result.total);
      setPage(result.page);
      setAppliedQuery(nextQuery);
      setAppliedRole(nextRole);
      setLoaded(true);
      setPendingSource(null);
    });
  }

  useEffect(() => {
    const load = window.setTimeout(() => search(1, "", "all"), 0);
    return () => window.clearTimeout(load);
    // Load the first page after this org panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orgId identity
  }, [orgId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(1, query.trim(), role, "search");
  }

  return (
    <div className="border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
          People in this organization
        </p>
        <span className="text-xs text-muted" aria-live="polite">
          {loaded
            ? total
              ? `${firstResult}–${lastResult} of ${total}`
              : "0 members"
            : memberCount
              ? `${memberCount} on the roster`
              : "No members yet"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Search by name or email. Results stay paginated so large schools do not
        dump the whole roster into this page.
      </p>

      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="min-w-0">
          <span className="sr-only">Search members</span>
          <input
            className="field"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or email…"
            autoComplete="off"
            maxLength={200}
          />
        </label>
        <label>
          <span className="sr-only">Filter by org role</span>
          <select
            className="field"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as AdminOrgMemberRoleFilter)
            }
          >
            <option value="all">All roles</option>
            <option value="district_admin">District administrators</option>
            <option value="school_admin">School administrators</option>
            <option value="coach">Coaches</option>
            <option value="assistant_coach">Assistant coaches</option>
            <option value="student">Students</option>
            <option value="admin">Legacy organization admins</option>
          </select>
        </label>
        <button
          type="submit"
          className="cta-enabled disabled:opacity-60"
          disabled={isPending}
        >
          {isPending && pendingSource === "search" ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-3" aria-busy={isPending}>
        {error ? (
          <div role="alert">
            <p className="text-sm font-semibold text-brand-red">{error}</p>
            <p className="mt-1 text-xs text-muted">
              Apply migration 0094 on the linked database, then retry.
            </p>
          </div>
        ) : !loaded || (isPending && !members.length) ? (
          <p className="text-sm text-muted">Loading members…</p>
        ) : !members.length ? (
          <p className="text-sm text-muted">
            {appliedQuery || appliedRole !== "all"
              ? "No member matched that search."
              : "No active members in this organization."}
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {members.map((member) => (
              <li key={member.profile_id} className="py-2.5">
                <p className="text-sm font-semibold text-foreground">
                  {member.display_name || "Unnamed account"}
                </p>
                <p className="mt-0.5 break-all text-xs text-muted">
                  {contactLine(member)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Joined {formatJoinedAt(member.joined_at)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {hasPrevious || hasNext ? (
          <nav
            aria-label="Organization member pages"
            className="mt-3 flex items-center justify-between gap-4"
          >
            {hasPrevious ? (
              <PageBackButton
                onClick={() => search(page - 1)}
                disabled={isPending}
              >
                Previous
              </PageBackButton>
            ) : (
              <span />
            )}
            {hasNext ? (
              <PageNextButton
                onClick={() => search(page + 1)}
                disabled={isPending}
              >
                Next
              </PageNextButton>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
