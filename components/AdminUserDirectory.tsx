"use client";

import { FormEvent, useState, useTransition } from "react";
import { adminSearchUsers } from "@/lib/actions/admin";
import { AdminUserAccessForm } from "@/components/AdminUserAccessForm";

type AdminUserRow = {
  profile_id: string;
  email: string;
  display_name: string;
  account_role: "student" | "parent" | "coach";
  role_unlocked: boolean;
  platform_admin: boolean;
  created_at: string;
  total_count: number;
};

const PAGE_SIZE = 50;

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUserDirectory({
  initialUsers,
  initialTotal,
  initialError,
  currentAdminId,
}: {
  initialUsers: AdminUserRow[];
  initialTotal: number;
  initialError: string | null;
  currentAdminId: string;
}) {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();

  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const hasPrevious = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  function search(nextPage: number, nextQuery = appliedQuery) {
    setError(null);
    startTransition(async () => {
      const result = await adminSearchUsers({
        query: nextQuery,
        page: nextPage,
      });
      if (!result.ok) {
        setUsers([]);
        setTotal(0);
        setError(result.error);
        return;
      }
      setUsers(result.users);
      setTotal(result.total);
      setPage(result.page);
      setAppliedQuery(nextQuery);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(1, query.trim());
  }

  function updateVisibleUser(
    profileId: string,
    accountRole: AdminUserRow["account_role"],
    platformAdmin: boolean
  ) {
    setUsers((current) =>
      current.map((user) =>
        user.profile_id === profileId
          ? {
              ...user,
              account_role: accountRole,
              platform_admin: platformAdmin,
            }
          : user
      )
    );
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8">
        <label className="block">
          <span className="text-xs font-semibold text-muted-strong">
            Name or email
          </span>
          <span className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="field flex-1"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Student name or name@gmail.com"
              autoComplete="off"
              maxLength={200}
            />
            <button
              type="submit"
              className="cta-enabled shrink-0 disabled:opacity-60"
              disabled={isPending}
            >
              {isPending ? "Searching…" : "Search accounts"}
            </button>
          </span>
        </label>
      </form>

      <div className="section-rule mt-8 pt-8" aria-busy={isPending}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {appliedQuery ? `Results for “${appliedQuery}”` : "All accounts"}
          </h2>
          <span className="text-xs text-muted" aria-live="polite">
            {total
              ? `${firstResult}–${lastResult} of ${total}`
              : "0 accounts"}
          </span>
        </div>

        {error ? (
          <div className="mt-4" role="alert">
            <p className="text-sm font-semibold text-brand-red">{error}</p>
            <p className="mt-1 text-xs text-muted">
              {error.includes("migration")
                ? "Apply the pending database migration, then retry this page."
                : "Retry the page. If this continues, check the database function logs."}
            </p>
          </div>
        ) : !users.length ? (
          <p className="mt-4 text-sm text-muted">
            {appliedQuery
              ? "No account matched that name or email. Check the spelling or search a shorter part."
              : "No Causey accounts are available."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {users.map((user) => (
              <li key={user.profile_id} className="py-4">
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">
                          {user.display_name || "Unnamed account"}
                          {user.profile_id === currentAdminId ? " (you)" : ""}
                        </span>
                        <span className="mt-0.5 block break-all text-xs text-muted">
                          {user.email || "No email"} · {user.account_role}
                          {!user.role_unlocked ? " · restricted" : ""}
                        </span>
                      </span>
                      <span className="text-right text-xs text-muted-strong">
                        {user.platform_admin
                          ? "Platform admin"
                          : "Standard account"}
                        <span className="mt-0.5 block font-normal text-muted">
                          Joined {formatCreatedAt(user.created_at)}
                        </span>
                      </span>
                    </span>
                  </summary>
                  <div className="mt-4 border-l-2 border-line pl-4">
                    <AdminUserAccessForm
                      user={user}
                      isSelf={user.profile_id === currentAdminId}
                      onUpdated={(accountRole, platformAdmin) =>
                        updateVisibleUser(
                          user.profile_id,
                          accountRole,
                          platformAdmin
                        )
                      }
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        {hasPrevious || hasNext ? (
          <nav
            aria-label="User directory pages"
            className="mt-6 flex items-center justify-between gap-4"
          >
            {hasPrevious ? (
              <button
                type="button"
                onClick={() => search(page - 1)}
                disabled={isPending}
                className="text-sm font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
              >
                ← Previous
              </button>
            ) : (
              <span />
            )}
            {hasNext ? (
              <button
                type="button"
                onClick={() => search(page + 1)}
                disabled={isPending}
                className="text-sm font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
              >
                Next →
              </button>
            ) : null}
          </nav>
        ) : null}
      </div>
    </>
  );
}
