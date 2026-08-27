import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DistrictSchoolForm } from "@/components/DistrictSchoolForm";
import { OrganizationSettingsForm } from "@/components/OrganizationSettingsForm";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { getSessionUser } from "@/lib/auth/session";
import {
  getOrganizationVerificationReview,
  getOrgBySlugForViewer,
  getOrgRoster,
} from "@/lib/data/portal";

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
  const [roster, verificationReview] = await Promise.all([
    getOrgRoster(view.org.id),
    getOrganizationVerificationReview(view.org.id),
  ]);
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
              : "Organization controls"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {view.org.type === "district"
            ? "Keep the district record accurate, provision school workspaces, and make ownership changes deliberately."
            : "Keep the organization record accurate and make ownership changes deliberately. Coaches manage tournaments; administrators manage the organization itself."}
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
                    {school.verification_status === "rejected" ? (
                      <Link
                        href={`/orgs/${school.slug}/settings#verification`}
                        className="text-xs font-semibold text-brand-red hover:underline"
                      >
                        Needs correction — correct school details
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">
                        {school.verification_status === "verified"
                          ? "Verified"
                          : "Platform review pending"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
