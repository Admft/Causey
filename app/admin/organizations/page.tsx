import type { Metadata } from "next";
import Link from "next/link";
import { AdminOrganizationForm } from "@/components/AdminOrganizationForm";
import { getAdminOrganizations } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin organizations",
  description: "Create and review district and school workspaces.",
};

const TYPE_LABELS: Record<string, string> = {
  district: "District",
  school: "School",
  club: "Club",
  team: "Team",
};

export default async function AdminOrganizationsPage() {
  const organizations = await getAdminOrganizations();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Organizations
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Create the district or school record here. Staff delegation and child-school
        hierarchy still require the later district provisioning work.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Create an organization
          </h2>
          <div className="mt-4 rounded-xl border border-line bg-surface p-5">
            <AdminOrganizationForm />
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              All organizations
            </h2>
            <span className="text-xs text-muted">{organizations.length} total</span>
          </div>
          {!organizations.length ? (
            <p className="mt-4 text-sm text-muted">
              No organizations are visible to this administrator.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
              {organizations.map((org) => (
                <li
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/orgs/${org.slug}`}
                      className="font-semibold text-foreground hover:text-brand-red"
                    >
                      {org.name}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">
                      {TYPE_LABELS[org.type] ?? org.type}
                      {org.state ? ` · ${org.state}` : ""}
                    </span>
                  </div>
                  <Link
                    href={`/admin/tournaments/new?org=${org.id}`}
                    className="text-sm font-semibold text-brand-red hover:underline"
                  >
                    Add tournament
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
