import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOrganizationsExplorer } from "@/components/AdminOrganizationsExplorer";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminOrganizations } from "@/lib/data/admin";
import { getDistrictPilotReadiness } from "@/lib/data/district";

export const metadata: Metadata = {
  title: "Admin organizations",
  description: "Review, verify, and create district and school workspaces.",
};

export default async function AdminOrganizationsPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const organizations = await getAdminOrganizations();
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
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
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
        <AdminOrganizationsExplorer
          organizations={organizations}
          districtReadinessById={districtReadinessById}
        />
      </div>
    </main>
  );
}
