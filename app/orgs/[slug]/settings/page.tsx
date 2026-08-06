import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DistrictSchoolForm } from "@/components/DistrictSchoolForm";
import { OrganizationSettingsForm } from "@/components/OrganizationSettingsForm";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { getSessionUser } from "@/lib/auth/session";
import { getOrgBySlugForViewer, getOrgRoster } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Organization settings",
  description: "Manage organization details, ownership, and district schools.",
};

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/settings`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);
  const roster = await getOrgRoster(view.org.id);

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="settings"
        showRoster={view.isCoach}
        showAdmin={view.isAdmin}
      />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">Settings</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Organization controls
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Keep the organization record accurate and make ownership changes
          deliberately. Coaches manage tournaments; administrators manage the
          organization itself.
        </p>
        <section className="section-rule mt-8 pt-8">
          <OrganizationSettingsForm
            org={view.org}
            staff={roster}
            viewerId={user.id}
          />
        </section>

        {view.isDistrictAdmin ? (
          <section id="schools" className="section-rule mt-10 scroll-mt-24 pt-8">
            <h2 className="font-display text-xl font-bold text-foreground">
              District schools
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Create the school workspace first. Then open it to delegate a
              school administrator and provision staff or students.
            </p>
            <div className="mt-5">
              <DistrictSchoolForm
                districtId={view.org.id}
                districtSlug={view.org.slug}
                defaultState={view.org.state}
              />
            </div>
            {view.schools.length ? (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {view.schools.map((school) => (
                  <li
                    key={school.id}
                    className="flex items-baseline justify-between gap-3 py-3"
                  >
                    <Link
                      href={`/orgs/${school.slug}`}
                      className="text-sm font-semibold text-foreground hover:text-brand-red"
                    >
                      {school.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {school.verification_status === "verified"
                        ? "Verified"
                        : "Needs platform review"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
