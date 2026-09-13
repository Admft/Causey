import type { Metadata } from "next";
import Link from "next/link";
import { AdminMixChart } from "@/components/AdminCharts";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { AdminUserDirectory } from "@/components/AdminUserDirectory";
import { remainderCount } from "@/lib/admin-charts";
import {
  adminUsersClearHref,
  adminUsersHaveFilters,
  adminUsersHref,
  parseAdminUserFilters,
} from "@/lib/admin-user-filters";
import {
  getPlatformAdminUser,
  isCurrentUserSuperAdmin,
} from "@/lib/auth/platform-admin";
import {
  countPlatformAdmins,
  getAdminOrganizationScopesById,
  getAdminUsers,
  getFilteredAdminUsers,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Search Causey accounts and manage platform access.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    access?: string;
    q?: string;
    district?: string;
    org?: string;
    orgType?: string;
    accountRole?: string;
    membershipRole?: string;
    membershipStatus?: string;
    cursor?: string;
    direction?: string;
  }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) return null;
  const isSuperAdmin = await isCurrentUserSuperAdmin();
  const filters = parseAdminUserFilters(await searchParams);
  const hasFilters = adminUsersHaveFilters(filters);
  const [directory, platformAdmins, allAccounts, scopeLabels] = await Promise.all([
    getFilteredAdminUsers(filters, 50),
    countPlatformAdmins(),
    getAdminUsers({ limit: 1 }),
    getAdminOrganizationScopesById(
      [filters.districtId, filters.orgId].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ]);
  const { users, total, error } = directory;
  const totalAccounts = allAccounts.error ? null : allAccounts.total;
  const initialDistrict = filters.districtId
    ? (scopeLabels.get(filters.districtId) ?? null)
    : null;
  const initialOrganization = filters.orgId
    ? (scopeLabels.get(filters.orgId) ?? null)
    : null;
  const previousHref = directory.previousCursor
    ? adminUsersHref(filters, {
        cursor: directory.previousCursor,
        direction: "previous",
      })
    : null;
  const nextHref = directory.nextCursor
    ? adminUsersHref(filters, {
        cursor: directory.nextCursor,
        direction: "next",
      })
    : null;
  const directoryKey = [
    filters.access,
    filters.q,
    filters.districtId,
    filters.orgId,
    filters.orgType,
    filters.accountRole,
    filters.membershipRole,
    filters.membershipStatus,
    filters.cursor?.id,
    filters.direction,
  ].join(":");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Users &amp; access
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Search accounts by name, district, school, club, team, and role. Results
        stay server-filtered and paginated so the directory remains usable as
        Causey grows. Account and platform-access changes remain confirmed and
        audited.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Accounts"
          items={[
            {
              label: "Total accounts",
              value: totalAccounts,
              href: "/admin/users",
              current: filters.access === "all",
            },
            {
              label: "Platform admins",
              value: platformAdmins,
              href: "/admin/users?access=admins",
              current: filters.access === "admins",
            },
          ]}
          chart={
            <AdminMixChart
              title="Access"
              segments={[
                {
                  label: "Platform admins",
                  value: platformAdmins,
                  tone: "ok",
                },
                {
                  label: "Everyone else",
                  value: remainderCount(totalAccounts, platformAdmins),
                  tone: "quiet",
                },
              ]}
            />
          }
        />
      </div>

      <div className="mt-8">
        <AdminUserDirectory
          key={directoryKey}
          access={filters.access}
          initialUsers={users}
          initialTotal={total}
          initialError={error}
          initialQuery={filters.q}
          initialDistrict={initialDistrict}
          initialOrganization={initialOrganization}
          initialOrgType={filters.orgType}
          initialAccountRole={filters.accountRole}
          initialMembershipRole={filters.membershipRole}
          initialMembershipStatus={filters.membershipStatus}
          clearHref={adminUsersClearHref(filters)}
          previousHref={previousHref}
          nextHref={nextHref}
          hasFilters={hasFilters}
          currentAdminId={admin.id}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      <p className="mt-8 text-xs text-muted">
        Prefer organization People invites for day-to-day staffing. Use the
        membership form above for support repairs, or open{" "}
        <Link
          href="/admin/organizations"
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          Organizations
        </Link>{" "}
        to find a slug.
      </p>
    </div>
  );
}
