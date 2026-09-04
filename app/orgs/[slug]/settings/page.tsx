import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DistrictSchoolForm } from "@/components/DistrictSchoolForm";
import { OrganizationSettingsForm } from "@/components/OrganizationSettingsForm";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalErrorState } from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import {
  BILLING_PREVIEW_PATH,
  PORTAL_PREVIEW_PATH,
  isLocalPreviewEnabled,
} from "@/lib/local-preview";
import { getDistrictPilotReadiness } from "@/lib/data/district";
import {
  getOrganizationVerificationReview,
  getOrgBySlugForViewer,
  getOrgRoster,
} from "@/lib/data/portal";
import { getDistrictSchoolReadinessStatus } from "@/lib/district-readiness";

export const metadata: Metadata = {
  title: "Organization settings",
  description: "Manage organization details, ownership, and district schools.",
};

export default async function OrganizationSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setup?: string; district?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/settings`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);
  const [roster, verificationReview, districtReadinessResult] =
    await Promise.all([
      getOrgRoster(view.org.id),
      getOrganizationVerificationReview(view.org.id),
      view.isDistrictAdmin
        ? getDistrictPilotReadiness(view.org.id)
        : Promise.resolve(null),
    ]);
  const districtReadiness =
    districtReadinessResult?.ok === true ? districtReadinessResult.data : null;
  const districtReadinessError = districtReadinessResult?.ok === false;
  const readySchoolCount =
    districtReadiness?.schools.filter(
      (school) =>
        getDistrictSchoolReadinessStatus(school, view.org.slug).ready
    ).length ?? 0;
  const districtSlug =
    query.district && /^[a-z0-9-]+$/.test(query.district)
      ? query.district
      : null;
  const isOwnershipSetup =
    query.setup === "ownership" &&
    view.org.type === "school" &&
    Boolean(view.org.parent_org_id);

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="settings"
        showRoster={view.isCoach && view.org.type !== "district"}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">Settings</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {view.org.type === "district"
            ? "District controls"
            : view.org.type === "school"
              ? "School controls"
              : view.org.type === "team"
                ? "Team controls"
                : "Club controls"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {view.org.type === "district"
            ? "Keep the district record accurate, provision school workspaces, and make ownership changes deliberately."
            : view.org.type === "school"
              ? "Keep the school record accurate and make ownership changes deliberately. Coaches manage tournaments; administrators manage the school itself."
              : "Keep the club or team record accurate and make ownership changes deliberately. Coaches manage tournaments; administrators manage the workspace itself."}
        </p>
        {isOwnershipSetup ? (
          <section className="mt-8 border-l-2 border-brand-red pl-5">
            <h2 className="text-base font-semibold text-foreground">
              Hand off this school
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Choose the claimed school administrator under Ownership.
              District administrators keep parent-district authority after the
              transfer.
            </p>
            {districtSlug ? (
              <Link
                href={`/orgs/${districtSlug}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-red hover:underline"
              >
                Back to district setup
              </Link>
            ) : null}
          </section>
        ) : null}
        <section
          id="verification"
          aria-labelledby="verification-heading"
          className="mt-8 scroll-mt-24 rounded-xl border border-line bg-surface p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Organization verification
          </p>
          <h2
            id="verification-heading"
            className="mt-2 text-base font-semibold text-foreground"
          >
            {view.org.verification_status === "verified"
              ? "Verified by Causey"
              : view.org.verification_status === "rejected"
                ? "Organization details need correction"
                : "Platform review pending"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {view.org.verification_status === "verified"
              ? "Causey has reviewed this organization identity. Keep the record below accurate."
              : view.org.verification_status === "rejected"
                ? verificationReview?.note ??
                  "A platform administrator returned this organization for correction."
                : "Identity review happens in Causey’s platform admin queue. There is no submit button here — keep the name and location accurate below, and continue staffing while review finishes."}
          </p>
          {view.org.verification_status === "pending" ? (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                href={`/orgs/${view.org.slug}/people`}
                className="cta-enabled inline-flex"
              >
                Manage people
              </Link>
              {view.org.type !== "district" ? (
                <Link
                  href={`/orgs/${view.org.slug}/roster`}
                  className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Open roster
                </Link>
              ) : (
                <Link
                  href={`#schools`}
                  className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Manage schools
                </Link>
              )}
            </div>
          ) : null}
          {view.org.verification_status === "rejected" ? (
            <p className="mt-2 max-w-2xl text-xs font-medium text-muted-strong">
              Correct the organization details below and save. Saving does not
              change the review status by itself — once corrections are in,
              your Causey pilot contact re-queues the record for platform
              review.
            </p>
          ) : null}
        </section>
        {isLocalPreviewEnabled() &&
        (view.org.type === "club" || view.org.type === "team") ? (
          <section className="mt-8 rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
              Local preview
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              Club subscription
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Checkout is not connected. This block is hidden on Vercel so a
              deploy cannot start charging clubs.
            </p>
            <Link
              href={BILLING_PREVIEW_PATH}
              className="mt-4 inline-flex cta-outline"
            >
              Open billing layout
            </Link>
          </section>
        ) : null}
        {isLocalPreviewEnabled() && view.org.type === "district" ? (
          <section className="mt-8 rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
              Local preview
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              Custom district portal
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              January pilots stay on the shared Causey workspace. This block
              is hidden on Vercel so a deploy cannot start a vanity host.
            </p>
            <Link
              href={PORTAL_PREVIEW_PATH}
              className="mt-4 inline-flex cta-outline"
            >
              Open portal layout
            </Link>
          </section>
        ) : null}
        <section className="section-rule mt-8 pt-8">
          <OrganizationSettingsForm
            org={view.org}
            staff={roster}
            viewerId={user.id}
          />
        </section>

        {view.isDistrictAdmin ? (
          <section id="schools" className="section-rule mt-10 scroll-mt-24 pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  District schools
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Create a school workspace, then follow each school’s next
                  setup action — the same readiness path as the district
                  overview, not verification status alone.
                </p>
              </div>
              {districtReadiness ? (
                <p className="text-xs text-muted">
                  {readySchoolCount} of {districtReadiness.schools.length} ready
                </p>
              ) : null}
            </div>
            <div className="mt-5">
              <DistrictSchoolForm
                districtId={view.org.id}
                districtSlug={view.org.slug}
                defaultState={view.org.state}
              />
            </div>
            {districtReadinessError ? (
              <PortalErrorState
                title="School readiness could not load"
                description="Retry this list before inviting administrators or provisioning students, so you do not act on incomplete information."
                action={{
                  href: `/orgs/${view.org.slug}/settings?retry=readiness#schools`,
                  label: "Retry school readiness",
                }}
              />
            ) : null}
            {districtReadiness && !districtReadiness.schools.length ? (
              <p className="mt-6 max-w-prose text-sm text-muted">
                No school workspaces yet. Create the first school above, then
                delegate its administrator before provisioning students.
              </p>
            ) : null}
            {districtReadiness?.schools.length ? (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {districtReadiness.schools.map((school) => {
                  const status = getDistrictSchoolReadinessStatus(
                    school,
                    view.org.slug
                  );
                  return (
                    <li
                      key={school.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <Link
                          href={`/orgs/${school.slug}`}
                          className="text-sm font-semibold text-foreground hover:text-brand-red"
                        >
                          {school.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {status.label}
                          {school.activeStudents
                            ? ` · ${school.activeStudents} ${
                                school.activeStudents === 1
                                  ? "student"
                                  : "students"
                              }`
                            : ""}
                        </p>
                      </div>
                      <Link
                        href={status.href}
                        className="text-xs font-semibold text-brand-red hover:underline"
                      >
                        {status.actionLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
