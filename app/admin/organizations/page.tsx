import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBarChart, AdminMixChart } from "@/components/AdminCharts";
import { AdminOrganizationsExplorer } from "@/components/AdminOrganizationsExplorer";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import {
  getPlatformAdminUser,
  isCurrentUserSuperAdmin,
} from "@/lib/auth/platform-admin";
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

  const [organizations, stats, canProvisionDistrict] = await Promise.all([
    getAdminOrganizations(),
    getAdminOpsStats(["organizations"]),
    isCurrentUserSuperAdmin(),
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

  const typeCounts = {
    district: 0,
    school: 0,
    club: 0,
    team: 0,
  };
  for (const organization of organizations) {
    typeCounts[organization.type] += 1;
  }
  const typeChartReady =
    stats.organizations.total !== null &&
    organizations.length === stats.organizations.total;

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
          chart={
            <div className="grid gap-6 sm:grid-cols-2">
              <AdminMixChart
                title="Verification"
                segments={[
                  {
                    label: "Need review",
                    value: stats.organizations.pending,
                    tone: "attention",
                  },
                  {
                    label: "Corrections",
                    value: stats.organizations.rejected,
                    tone: "progress",
                  },
                  {
                    label: "Verified",
                    value: stats.organizations.verified,
                    tone: "ok",
                  },
                ]}
              />
              <AdminBarChart
                title="By type"
                segments={[
                  {
                    label: "District",
                    value: typeChartReady ? typeCounts.district : null,
                    tone: "ok",
                  },
                  {
                    label: "School",
                    value: typeChartReady ? typeCounts.school : null,
                    tone: "quiet",
                  },
                  {
                    label: "Club",
                    value: typeChartReady ? typeCounts.club : null,
                    tone: "quiet",
                  },
                  {
                    label: "Team",
                    value: typeChartReady ? typeCounts.team : null,
                    tone: "quiet",
                  },
                ]}
              />
            </div>
          }
        />
      </div>

      <div className="mt-8">
        <AdminOrganizationsExplorer
          key={initialStatus}
          organizations={organizations}
          districtReadinessById={districtReadinessById}
          initialStatus={initialStatus}
          canProvisionDistrict={canProvisionDistrict}
        />
      </div>
    </div>
  );
}
