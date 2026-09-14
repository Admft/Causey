import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DistrictSchoolForm } from "@/components/DistrictSchoolForm";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalErrorState } from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import { getDistrictPilotReadiness } from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";
import { getDistrictSchoolReadinessStatus } from "@/lib/district-readiness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "District schools",
  description:
    "Create school workspaces, delegate administrators, and review aggregate setup readiness.",
};

export default async function DistrictSchoolsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/schools`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (view.org.type !== "district" || !view.isDistrictAdmin) {
    redirect(`/orgs/${slug}`);
  }

  const readinessResult = await getDistrictPilotReadiness(view.org.id);
  const readiness = readinessResult.ok ? readinessResult.data : null;
  const readyCount =
    readiness?.schools.filter(
      (school) =>
        getDistrictSchoolReadinessStatus(school, view.org.slug).ready
    ).length ?? 0;

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="schools"
        showRoster={false}
        showAdmin
        orgType="district"
        roleLabel="District administrator"
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">District schools</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
              Schools & readiness
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Create one workspace per school, invite its primary
              administrator, then hand off ownership. Student information stays
              inside each school; this page uses aggregate counts.
            </p>
          </div>
          {readiness?.schools.length ? (
            <p className="text-sm font-semibold text-muted-strong">
              {readyCount} of {readiness.schools.length} schools ready
            </p>
          ) : null}
        </div>

        <section id="add-school" className="section-rule mt-8 scroll-mt-24 pt-8">
          <h2 className="text-base font-semibold text-foreground">
            {readiness?.schools.length
              ? "Add a school"
              : "Create the first school"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {readiness?.schools.length
              ? "After creation, Causey opens the school staffing step so you can invite its administrator."
              : "No school workspaces yet. After creation, Causey opens the school staffing step so you can invite its administrator."}
          </p>
          <div className="mt-5">
            <DistrictSchoolForm
              districtId={view.org.id}
              districtSlug={view.org.slug}
              defaultState={view.org.state}
            />
          </div>
        </section>

        {readinessResult.ok === false ? (
          <PortalErrorState
            title="School readiness could not load"
            description="No schools or counts are shown from a partial read. Retry before taking a staffing action."
            action={{
              href: `/orgs/${view.org.slug}/schools?retry=readiness`,
              label: "Retry school readiness",
            }}
          />
        ) : readiness?.schools.length ? (
          <section className="section-rule mt-8 pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Connected schools
              </h2>
              <Link
                href={`/orgs/${view.org.slug}/people`}
                className="text-sm font-semibold text-brand-red hover:underline"
              >
                Review district &amp; school staff
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {readiness.schools.map((school) => {
                const status = getDistrictSchoolReadinessStatus(
                  school,
                  view.org.slug
                );
                return (
                  <li
                    key={school.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <Link
                        href={`/orgs/${school.slug}`}
                        className="text-sm font-semibold text-foreground hover:text-brand-red"
                      >
                        {school.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {status.label} · {school.activeStudents} active{" "}
                        {school.activeStudents === 1 ? "student" : "students"}{" "}
                        · {school.activeDelegatedAdmins} delegated{" "}
                        {school.activeDelegatedAdmins === 1
                          ? "administrator"
                          : "administrators"}
                      </p>
                    </div>
                    <Link
                      href={status.href}
                      className="text-sm font-semibold text-brand-red hover:underline"
                    >
                      {status.actionLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
