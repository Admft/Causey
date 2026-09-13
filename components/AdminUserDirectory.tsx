"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminOrgMembershipForm } from "@/components/AdminOrgMembershipForm";
import { AdminUserAccessForm } from "@/components/AdminUserAccessForm";
import { AdminUserDeleteForm } from "@/components/AdminUserDeleteForm";
import { AdminUserScopePicker } from "@/components/AdminUserScopePicker";
import { PageBackLink, PageNextLink } from "@/components/PageBackLink";
import type {
  AdminOrganizationScope,
  AdminUserAccessFilter,
  AdminUserDirectoryRow,
  AdminUserMatchingMembership,
} from "@/lib/data/admin";

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function accessLabel(user: AdminUserRow): string {
  if (user.super_admin) return "Protected founder account";
  if (user.platform_admin) return "Platform admin";
  return "Standard account";
}

type AdminUserRow = AdminUserDirectoryRow;

const MEMBERSHIP_ROLE_LABELS: Record<
  AdminUserMatchingMembership["role"],
  string
> = {
  student: "Student",
  assistant_coach: "Assistant coach",
  coach: "Coach",
  school_admin: "School administrator",
  district_admin: "District administrator",
  admin: "Organization admin",
};

function membershipLine(membership: AdminUserMatchingMembership): string {
  const org =
    membership.org_type === "school" && membership.parent_name
      ? `${membership.org_name} · ${membership.parent_name}`
      : membership.org_name;
  const status =
    membership.status === "invited"
      ? "Invite pending"
      : membership.status === "removed"
        ? "Removed"
        : "Active";
  return `${org} · ${MEMBERSHIP_ROLE_LABELS[membership.role]} · ${status}`;
}

export function AdminUserDirectory({
  initialUsers,
  initialTotal,
  initialError,
  currentAdminId,
  isSuperAdmin,
  access = "all",
  initialQuery = "",
  initialDistrict,
  initialOrganization,
  initialOrgType,
  initialAccountRole,
  initialMembershipRole,
  initialMembershipStatus,
  clearHref,
  previousHref,
  nextHref,
  hasFilters = false,
}: {
  initialUsers: AdminUserRow[];
  initialTotal: number;
  initialError: string | null;
  currentAdminId: string;
  isSuperAdmin: boolean;
  access?: AdminUserAccessFilter;
  initialQuery?: string;
  initialDistrict: AdminOrganizationScope | null;
  initialOrganization: AdminOrganizationScope | null;
  initialOrgType?: string;
  initialAccountRole?: string;
  initialMembershipRole?: string;
  initialMembershipStatus?: string;
  clearHref: string;
  previousHref: string | null;
  nextHref: string | null;
  hasFilters?: boolean;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);

  function updateVisibleUser(
    profileId: string,
    accountRole: AdminUserRow["account_role"],
    platformAdmin: boolean
  ) {
    if (access === "admins" && !platformAdmin) {
      removeVisibleUser(profileId);
      return;
    }
    if (initialAccountRole && accountRole !== initialAccountRole) {
      removeVisibleUser(profileId);
      return;
    }
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

  function removeVisibleUser(profileId: string) {
    setUsers((current) =>
      current.filter((user) => user.profile_id !== profileId)
    );
    setTotal((current) => Math.max(0, current - 1));
  }

  return (
    <>
      <form
        method="get"
        className="mt-8 grid gap-4 rounded-xl border border-line bg-surface p-4"
      >
        {access === "admins" ? (
          <input type="hidden" name="access" value="admins" />
        ) : null}
        <label>
          <span className="text-xs font-semibold text-muted-strong">
            Name or email
          </span>
          <input
            className="field mt-1"
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Name or email address"
            autoComplete="off"
            maxLength={200}
          />
        </label>
        <AdminUserScopePicker
          initialDistrict={initialDistrict}
          initialOrganization={initialOrganization}
        />
        <p className="-mt-2 text-xs text-muted">
          District scope includes district staff and members of every connected
          school. Exact organization narrows to one roster.
        </p>
        <details
          open={Boolean(
            initialOrgType ||
              initialAccountRole ||
              initialMembershipRole ||
              initialMembershipStatus
          )}
        >
          <summary className="cursor-pointer text-sm font-semibold text-muted-strong hover:text-foreground">
            More filters
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                Organization type
              </span>
              <select
                className="field mt-1"
                name="orgType"
                defaultValue={initialOrgType ?? ""}
              >
                <option value="">Any organization type</option>
                <option value="district">Districts</option>
                <option value="school">Schools</option>
                <option value="club">Clubs</option>
                <option value="team">Teams</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                Account experience
              </span>
              <select
                className="field mt-1"
                name="accountRole"
                defaultValue={initialAccountRole ?? ""}
              >
                <option value="">Any account experience</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
                <option value="coach">Coach / organizer</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                Membership role
              </span>
              <select
                className="field mt-1"
                name="membershipRole"
                defaultValue={initialMembershipRole ?? ""}
              >
                <option value="">Any membership role</option>
                <option value="district_admin">District administrator</option>
                <option value="school_admin">School administrator</option>
                <option value="coach">Coach</option>
                <option value="assistant_coach">Assistant coach</option>
                <option value="student">Student</option>
                <option value="admin">Legacy organization admin</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                Membership status
              </span>
              <select
                className="field mt-1"
                name="membershipStatus"
                defaultValue={initialMembershipStatus ?? ""}
              >
                <option value="">Any membership status</option>
                <option value="active">Active</option>
                <option value="invited">Invite pending</option>
                <option value="removed">Removed</option>
              </select>
            </label>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="cta-enabled">
            Search accounts
          </button>
          {hasFilters ? (
            <Link
              href={clearHref}
              className="px-1 py-2 text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      <div className="section-rule mt-8 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {hasFilters
              ? "Filtered accounts"
              : access === "admins"
                ? "Platform admins"
                : "All accounts"}
          </h2>
          <span className="text-xs text-muted" aria-live="polite">
            {total ? `${total.toLocaleString()} matches` : "0 matches"}
          </span>
        </div>

        {initialError ? (
          <div className="mt-4" role="alert">
            <p className="text-sm font-semibold text-brand-red">
              {initialError}
            </p>
            <p className="mt-1 text-xs text-muted">
              Apply migration 0095 on the linked database, then retry.
            </p>
          </div>
        ) : !users.length ? (
          <p className="mt-4 text-sm text-muted">
            {hasFilters
              ? "No account matched those filters. Clear one filter or search a shorter name."
              : access === "admins"
                ? "No platform admin accounts are listed."
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
                        {user.matching_memberships?.length ? (
                          <span className="mt-1 block text-xs text-muted-strong">
                            {user.matching_memberships
                              .slice(0, 3)
                              .map(membershipLine)
                              .join(" / ")}
                            {user.matching_memberships.length > 3
                              ? ` / +${user.matching_memberships.length - 3} more`
                              : ""}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right text-xs text-muted-strong">
                        {accessLabel(user)}
                        <span className="mt-0.5 block font-normal text-muted">
                          Joined {formatCreatedAt(user.created_at)}
                        </span>
                      </span>
                    </span>
                  </summary>
                  <div className="mt-4 border-l-2 border-line pl-4">
                    <AdminUserAccessForm
                      user={{
                        ...user,
                        super_admin: Boolean(user.super_admin),
                      }}
                      isSelf={user.profile_id === currentAdminId}
                      canGrantPlatformAdmin={isSuperAdmin}
                      onUpdated={(accountRole, platformAdmin) =>
                        updateVisibleUser(
                          user.profile_id,
                          accountRole,
                          platformAdmin
                        )
                      }
                    />
                    <AdminOrgMembershipForm
                      profileId={user.profile_id}
                      displayName={user.display_name || user.email || "account"}
                    />
                    {isSuperAdmin &&
                    user.profile_id !== currentAdminId &&
                    !user.super_admin ? (
                      <AdminUserDeleteForm
                        profileId={user.profile_id}
                        email={user.email}
                        displayName={user.display_name}
                        onDeleted={() => removeVisibleUser(user.profile_id)}
                      />
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        {previousHref || nextHref ? (
          <nav
            aria-label="User directory pages"
            className="mt-6 flex items-center justify-between gap-4"
          >
            {previousHref ? (
              <PageBackLink href={previousHref}>
                Previous
              </PageBackLink>
            ) : (
              <span />
            )}
            {nextHref ? (
              <PageNextLink href={nextHref}>
                Next
              </PageNextLink>
            ) : null}
          </nav>
        ) : null}
      </div>
    </>
  );
}
