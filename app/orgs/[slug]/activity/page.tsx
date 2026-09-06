import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import {
  PortalEmptyState,
  PortalErrorState,
} from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import { getDistrictAdminActivity } from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";
import {
  districtActivityActionLabel,
  districtActivityDetail,
  formatDistrictActivityWhen,
} from "@/lib/district-activity";

// Reads the signed-in account, so this response is never shareable.
// Declared rather than inferred from cookies(): the day someone moves the
// session read out of this file, the caching contract should not move too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "District activity",
  description:
    "Review recent district and school administrative actions without opening private student browsing data.",
};

export default async function DistrictActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/activity`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (view.org.type !== "district" || !view.isDistrictAdmin) {
    redirect(`/orgs/${slug}`);
  }

  const activityResult = await getDistrictAdminActivity(view.org.id);
  const rows = activityResult.ok ? activityResult.data : [];
  const loadFailed = activityResult.ok === false;

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="activity"
        showRoster={false}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">District activity</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Recent administrative actions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          School creates, staff invitations, verification decisions, and
          competition status changes for this district and its connected
          schools. Invitation emails and private student browsing stay out of
          this list.
        </p>

        {loadFailed ? (
          <PortalErrorState
            title="Activity could not load"
            description="No activity rows were shown. Retry before treating the feed as empty."
            action={{
              href: `/orgs/${view.org.slug}/activity?retry=activity`,
              label: "Retry district activity",
            }}
          />
        ) : !rows.length ? (
          <section className="section-rule mt-8 pt-8">
            <PortalEmptyState
              title="No district activity recorded yet"
              description="Actions appear here after you create a school, send a staff invitation, or change school settings."
              action={{
                href: `/orgs/${view.org.slug}/settings#schools`,
                label: "Open schools setup",
              }}
            />
          </section>
        ) : (
          <section className="section-rule mt-8 pt-8" aria-labelledby="activity-list-heading">
            <h2
              id="activity-list-heading"
              className="font-display text-xl font-bold text-foreground"
            >
              Latest updates
            </h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {rows.map((row) => {
                const detail = districtActivityDetail(row);
                const actor = row.actor_display_name?.trim() || "Unknown actor";
                const scopeLabel =
                  row.scope_org_type === "district"
                    ? "District"
                    : "School";
                return (
                  <li key={row.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {districtActivityActionLabel(row.action)}
                      </p>
                      <time
                        className="text-xs font-semibold text-muted-strong"
                        dateTime={row.occurred_at}
                      >
                        {formatDistrictActivityWhen(row.occurred_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-muted-strong">
                      {scopeLabel}: {row.scope_org_name} · By {actor}
                    </p>
                    {detail ? (
                      <p className="mt-1 text-sm text-muted">{detail}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Need participation totals instead?{" "}
              <Link
                href={`/orgs/${view.org.slug}/reports`}
                className="font-semibold text-brand-red hover:underline"
              >
                Open district reports
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </>
  );
}
