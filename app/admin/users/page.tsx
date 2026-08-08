import type { Metadata } from "next";
import Link from "next/link";
import { AdminUserAccessForm } from "@/components/AdminUserAccessForm";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminUsers } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Search Causey accounts and manage platform access.",
};

const PAGE_SIZE = 50;

function pageHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/users?${suffix}` : "/admin/users";
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const admin = await getPlatformAdminUser();
  const { q, page: requestedPage } = await searchParams;
  const query = q?.trim().slice(0, 200) ?? "";
  const parsedPage = Number.parseInt(requestedPage ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const { users, total, error } = await getAdminUsers({
    query,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const hasPrevious = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Platform admin
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Users &amp; access
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Search every Causey account by display name or email. Platform access
        changes are confirmed, audited, and cannot be applied to your own
        account from this page.
      </p>

      <form action="/admin/users" method="get" className="mt-8">
        <label className="block">
          <span className="text-xs font-semibold text-muted-strong">
            Name or email
          </span>
          <span className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="field flex-1"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Student name or name@gmail.com"
              autoComplete="off"
            />
            <button type="submit" className="cta-enabled shrink-0">
              Search accounts
            </button>
          </span>
        </label>
      </form>

      <div className="section-rule mt-8 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {query ? `Results for “${query}”` : "All accounts"}
          </h2>
          <span className="text-xs text-muted">
            {total
              ? `${firstResult}–${lastResult} of ${total}`
              : "0 accounts"}
          </span>
        </div>

        {error ? (
          <div className="mt-4" role="alert">
            <p className="text-sm font-semibold text-brand-red">{error}</p>
            <p className="mt-1 text-xs text-muted">
              Apply the pending database migration, then retry this page.
            </p>
          </div>
        ) : !users.length ? (
          <p className="mt-4 text-sm text-muted">
            {query
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
                          {user.profile_id === admin?.id ? " (you)" : ""}
                        </span>
                        <span className="mt-0.5 block break-all text-xs text-muted">
                          {user.email || "No email"} · {user.account_role}
                          {user.role_unlocked ? " · coach tools allowed" : ""}
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
                      isSelf={user.profile_id === admin?.id}
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
              <Link
                href={pageHref(query, page - 1)}
                className="text-sm font-semibold text-muted-strong hover:text-brand-red"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {hasNext ? (
              <Link
                href={pageHref(query, page + 1)}
                className="text-sm font-semibold text-muted-strong hover:text-brand-red"
              >
                Next →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>

      <p className="mt-8 text-xs text-muted">
        Organization-specific coach, school-admin, and district-admin roles are
        managed from the organization’s{" "}
        <Link
          href="/admin/organizations"
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          workspace
        </Link>
        .
      </p>
    </main>
  );
}
