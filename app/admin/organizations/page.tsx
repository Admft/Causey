import type { Metadata } from "next";
import Link from "next/link";
import { AdminDistrictSchoolBulkVerify } from "@/components/AdminDistrictSchoolBulkVerify";
import { AdminOrganizationForm } from "@/components/AdminOrganizationForm";
import { AdminOrganizationVerificationForm } from "@/components/AdminOrganizationVerificationForm";
import { PortalMission } from "@/components/PortalPrimitives";
import {
  getAdminOrganizations,
  type AdminOrganizationRow,
} from "@/lib/data/admin";

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

function OrganizationReviewRow({ org }: { org: AdminOrganizationRow }) {
  const review = org.organization_verification_reviews[0] ?? null;
  return (
    <li className="py-4">
      <details open={org.verification_status === "pending"}>
        <summary className="cursor-pointer list-none">
          <span className="flex flex-wrap items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {org.name}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {TYPE_LABELS[org.type] ?? org.type}
                {org.state ? ` · ${org.state}` : ""}
                {org.parent ? ` · ${org.parent.name}` : ""}
              </span>
            </span>
            <span className="text-right text-xs font-semibold text-muted-strong">
              {org.verification_status === "verified"
                ? "Verified"
                : org.verification_status === "rejected"
                  ? "Needs correction"
                  : "Pending review"}
              {review ? (
                <time
                  className="mt-0.5 block font-normal text-muted"
                  dateTime={review.reviewed_at}
                >
                  Reviewed{" "}
                  {new Date(review.reviewed_at).toLocaleDateString("en-US")}
                </time>
              ) : null}
            </span>
          </span>
        </summary>
        <div className="mt-4 grid gap-4 border-l-2 border-line pl-4">
          {org.verification_status === "rejected" && review?.note ? (
            <p className="text-sm text-muted-strong">
              <strong className="font-semibold text-foreground">
                Correction note:
              </strong>{" "}
              {review.note}
            </p>
          ) : null}
          <AdminOrganizationVerificationForm
            orgId={org.id}
            orgSlug={org.slug}
            initialStatus={org.verification_status}
            initialNote={review?.note ?? null}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={`/orgs/${org.slug}`}
              className="font-semibold text-muted-strong hover:text-brand-red"
            >
              Open workspace
            </Link>
            <Link
              href={`/admin/tournaments/new?org=${org.id}`}
              className="font-semibold text-muted-strong hover:text-brand-red"
            >
              Add tournament draft
            </Link>
          </div>
        </div>
      </details>
    </li>
  );
}

export default async function AdminOrganizationsPage() {
  const organizations = (await getAdminOrganizations()).sort((a, b) => {
    const order = { pending: 0, rejected: 1, verified: 2 };
    return (
      order[a.verification_status] - order[b.verification_status] ||
      a.name.localeCompare(b.name)
    );
  });
  const pendingCount = organizations.filter(
    (org) => org.verification_status === "pending"
  ).length;
  const districts = organizations.filter((org) => org.type === "district");
  const districtIds = new Set(districts.map((district) => district.id));
  const ungrouped = organizations.filter(
    (org) =>
      org.type !== "district" &&
      (!org.parent_org_id || !districtIds.has(org.parent_org_id))
  );
  const mission =
    pendingCount > 0
      ? {
          title:
            pendingCount === 1
              ? "1 organization needs verification"
              : `${pendingCount} organizations need verification`,
          description:
            "Review organization identity before Causey treats it as verified in moderation and district workflows.",
          action: {
            href: "#verification-queue",
            label: "Review organizations",
          },
          secondary: {
            href: "/admin/moderation",
            label: "Open tournament moderation",
          },
        }
      : {
          title: "Organization review queue is clear",
          description:
            "New districts, schools, clubs, and teams remain pending until a platform administrator verifies them.",
          action: {
            href: "#provision",
            label: "Provision an organization",
          },
          secondary: {
            href: "/admin/moderation",
            label: "Open tournament moderation",
          },
        };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Organizations
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Verify organization identity and provision district records here.
        District admins then create connected school workspaces and delegate
        school administrators.
      </p>

      <div className="mt-8">
        <PortalMission
          title={mission.title}
          description={mission.description}
          action={mission.action}
          secondary={mission.secondary}
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section id="verification-queue" className="scroll-mt-24">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Verification queue
            </h2>
            <span className="text-xs text-muted">
              {organizations.length} total
            </span>
          </div>
          {!organizations.length ? (
            <p className="mt-4 text-sm text-muted">
              No organizations are visible to this administrator.
            </p>
          ) : (
            <div className="mt-4 grid gap-8">
              {districts.map((district) => {
                const schools = organizations.filter(
                  (org) => org.parent_org_id === district.id
                );
                const pendingSchools = schools.filter(
                  (school) => school.verification_status === "pending"
                );
                return (
                  <section key={district.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {district.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          District{" "}
                          {district.verification_status === "verified"
                            ? "verified"
                            : "not yet verified"}{" "}
                          · {schools.length}{" "}
                          {schools.length === 1 ? "school" : "schools"}
                        </p>
                      </div>
                      <Link
                        href={`/orgs/${district.slug}`}
                        className="text-xs font-semibold text-muted-strong hover:text-brand-red"
                      >
                        Open district
                      </Link>
                    </div>

                    {district.verification_status === "verified" ? (
                      <AdminDistrictSchoolBulkVerify
                        districtId={district.id}
                        districtSlug={district.slug}
                        districtName={district.name}
                        schools={pendingSchools.map((school) => ({
                          id: school.id,
                          name: school.name,
                        }))}
                      />
                    ) : pendingSchools.length ? (
                      <p className="mt-3 text-sm text-muted">
                        Verify the parent district before verifying its schools.
                      </p>
                    ) : null}

                    <ul className="mt-4 divide-y divide-line border-y border-line">
                      <OrganizationReviewRow org={district} />
                      {schools.map((school) => (
                        <OrganizationReviewRow
                          key={school.id}
                          org={school}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}

              {ungrouped.length ? (
                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    Independent organizations
                  </h3>
                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {ungrouped.map((org) => (
                      <OrganizationReviewRow key={org.id} org={org} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </section>

        <section id="provision" className="scroll-mt-24">
          <h2 className="text-sm font-semibold text-foreground">
            Provision an organization
          </h2>
          <p className="mt-2 text-xs text-muted">
            New records start pending. Verify only after checking the
            organization identity.
          </p>
          <div className="mt-4 rounded-xl border border-line bg-surface p-5">
            <AdminOrganizationForm />
          </div>
        </section>
      </div>
    </main>
  );
}
