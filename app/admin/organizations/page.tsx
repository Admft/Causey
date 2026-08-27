import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOrganizationsExplorer } from "@/components/AdminOrganizationsExplorer";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminOpsStats, getAdminOrganizations } from "@/lib/data/admin";
import { getDistrictPilotReadiness } from "@/lib/data/district";

export const metadata: Metadata = {
  title: "Admin organizations",
  description: "Review, verify, and create district and school workspaces.",
};

const ORG_STATUSES = ["pending", "rejected", "verified"] as const;

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const { status: rawStatus } = await searchParams;
  const initialStatus = ORG_STATUSES.includes(
    rawStatus as (typeof ORG_STATUSES)[number]
  )
    ? (rawStatus as (typeof ORG_STATUSES)[number])
    : "all";

  const [organizations, stats] = await Promise.all([
    getAdminOrganizations(),
    getAdminOpsStats(["organizations"]),
  ]);
  const districtReadinessById = Object.fromEntries(
    await Promise.all(
      organizations
        .filter((organization) => organization.type === "district")
        .map(
          async (district) =>
            [
              district.id,
              await getDistrictPilotReadiness(district.id),
            ] as const
        )
    )
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Organizations
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Review new organizations, verify the ones you trust, and open any
        workspace. District admins connect their own schools after their
        district is verified.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Verification"
          items={[
            {
              label: "Need review",
              value: stats.organizations.pending,
              href: "/admin/organizations?status=pending",
            },
            {
              label: "Corrections sent",
              value: stats.organizations.rejected,
              href: "/admin/organizations?status=rejected",
            },
            {
              label: "Verified",
              value: stats.organizations.verified,
              href: "/admin/organizations?status=verified",
            },
            {
              label: "Total",
              value: stats.organizations.total,
              href: "/admin/organizations",
            },
            {
              label: "Districts",
              value: stats.organizations.districts,
              href: "/admin/organizations",
            },
          ]}
        />
      </div>

      <div className="mt-8">
        <AdminOrganizationsExplorer
          key={initialStatus}
          organizations={organizations}
          districtReadinessById={districtReadinessById}
          initialStatus={initialStatus}
        />
      </div>
    </div>
  );
}
