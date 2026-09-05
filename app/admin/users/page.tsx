import type { Metadata } from "next";
import Link from "next/link";
import { AdminMixChart } from "@/components/AdminCharts";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { AdminUserDirectory } from "@/components/AdminUserDirectory";
import { remainderCount } from "@/lib/admin-charts";
import {
  getPlatformAdminUser,
  isCurrentUserSuperAdmin,
} from "@/lib/auth/platform-admin";
import {
  adminUsersHref,
  countPlatformAdmins,
  getAdminUsers,
  parseAdminUserAccess,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Search Causey accounts and manage platform access.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) return null;
  const isSuperAdmin = await isCurrentUserSuperAdmin();
  const { access: rawAccess } = await searchParams;
  const access = parseAdminUserAccess(rawAccess);
  const [directory, platformAdmins, allAccounts] = await Promise.all([
    getAdminUsers({
      limit: 50,
      access,
    }),
    countPlatformAdmins(),
    access === "admins" ? getAdminUsers({ limit: 1 }) : Promise.resolve(null),
  ]);
  const { users, total, error } = directory;
  const totalAccounts =
    access === "admins"
      ? allAccounts && !allAccounts.error
        ? allAccounts.total
        : null
      : error
        ? null
        : total;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Users &amp; access
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Search every Causey account by display name or email. Platform access
        changes are confirmed, audited, and cannot be applied to your own
        account from this page. Founder super-admins can also delete accounts
        after typing the email. Organization membership can also be granted or
        repaired here when a claim link is blocked.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Accounts"
          items={[
            {
              label: "Total accounts",
              value: totalAccounts,
              href: adminUsersHref("all"),
              current: access === "all",
            },
            {
              label: "Platform admins",
              value: platformAdmins,
              href: adminUsersHref("admins"),
              current: access === "admins",
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
          key={access}
          access={access}
          initialUsers={users}
          initialTotal={total}
          initialError={error}
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
