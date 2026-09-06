import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import {
  PortalEmptyState,
  PortalErrorState,
} from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import {
  getDistrictParticipationReport,
  getOrgSeasonAttendance,
} from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";
import { COMPETITION_TYPES } from "@/lib/competition-types";
import { formatDateRange, formatRecordedResult } from "@/lib/format";
import {
  OPEN_COMPETITIONS_LABEL,
  orgCompetitionsHref,
  organizationKindLabel,
} from "@/lib/portal-copy";
import { CompetitionCategorySchema } from "@/lib/schemas";

// Reads the signed-in account, so this response is never shareable.
// Declared rather than inferred from cookies(): the day someone moves the
// session read out of this file, the caching contract should not move too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization reporting",
  description: "Review participation and attendance without exposing browsing data.",
};

export default async function OrganizationReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/reports`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);

  const categoryParse = CompetitionCategorySchema.safeParse(filters.category);
  const reportCategory = categoryParse.success ? categoryParse.data : null;

  const [districtReportResult, attendanceResult] = await Promise.all([
    view.isDistrictAdmin
      ? getDistrictParticipationReport(view.org.id, reportCategory)
      : Promise.resolve(null),
    view.org.type === "district"
      ? Promise.resolve({ ok: true as const, data: [] })
      : getOrgSeasonAttendance(view.org.id),
  ]);
  const districtReport =
    districtReportResult?.ok === true ? districtReportResult.data : null;
  const districtRollup = districtReport?.schools ?? [];
  const districtHosted = districtReport?.districtHosted ?? null;
  const hostedBySchool = districtReport?.hostedBySchool ?? [];
  const districtReportError = districtReportResult?.ok === false;
  const attendanceError = attendanceResult.ok === false;
  const attendance =
    attendanceResult.ok === true ? attendanceResult.data : [];
  const orgKind = organizationKindLabel(view.org.type);
  const hasDistrictHostedActivity = districtHosted
    ? districtHosted.upcoming_tournaments +
        districtHosted.invitations_pending +
        districtHosted.going_count +
        districtHosted.attended_this_season >
      0
    : false;
  const attended = attendance.filter((row) => row.status === "attended").length;
  const absent = attendance.filter((row) => row.status === "did_not_attend").length;
  const exportQuery = reportCategory ? `?category=${reportCategory}` : "";
  const retryReportHref = reportCategory
    ? `/orgs/${view.org.slug}/reports?retry=report&category=${reportCategory}`
    : `/orgs/${view.org.slug}/reports?retry=report`;

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="reports"
        showRoster={view.isCoach && view.org.type !== "district"}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          {view.org.type === "district"
            ? "District reporting"
            : view.org.type === "school"
              ? "School reporting"
              : view.org.type === "team"
                ? "Team reporting"
                : "Club reporting"}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {view.isDistrictAdmin ? "District participation" : "Season attendance"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {view.isDistrictAdmin
            ? "School-hosted and district-hosted activity stay separate. This aggregate view does not expose students’ private searches, saves, or browsing activity."
            : `Review who attended events this ${orgKind} hosted or marked as attending this calendar year, plus any place or award a coach recorded.`}
        </p>
        {view.isDistrictAdmin ? (
          <form
            method="get"
            className="mt-6 flex flex-wrap items-end gap-3"
          >
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                Competition type
              </span>
              <select
                name="category"
                className="field mt-1 w-auto min-w-[12rem]"
                defaultValue={reportCategory ?? ""}
              >
                <option value="">All types</option>
                {COMPETITION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
            >
              Show
            </button>
            {reportCategory ? (
              <Link
                href={`/orgs/${view.org.slug}/reports`}
                className="py-3 text-sm font-semibold text-muted-strong hover:text-brand-red"
              >
                All types
              </Link>
            ) : null}
          </form>
        ) : null}

        {view.isDistrictAdmin &&
        !districtReportError &&
        (districtRollup.length ||
          hasDistrictHostedActivity ||
          hostedBySchool.length) ? (
          <a
            href={`/orgs/${view.org.slug}/reports/export${exportQuery}`}
            className="mt-5 inline-flex rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
          >
            Download participation CSV
          </a>
        ) : !view.isDistrictAdmin && !attendanceError && attendance.length ? (
          <a
            href={`/orgs/${view.org.slug}/reports/export`}
            className="mt-5 inline-flex rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
          >
            Download attendance CSV
          </a>
        ) : null}

        {view.isDistrictAdmin ? (
          districtReportError ? (
            <PortalErrorState
              title="District reporting could not load"
              description="No totals or CSV were generated. Retry the report before using participation numbers."
              action={{
                href: retryReportHref,
                label: "Retry district reporting",
              }}
            />
          ) : (
            <>
              <section className="section-rule mt-8 pt-8">
                <h2 className="font-display text-xl font-bold text-foreground">
                  District-hosted competitions
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  These totals belong to the district workspace. They are not
                  divided among school rows without a recorded school
                  attribution.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Upcoming",
                      value: districtHosted?.upcoming_tournaments ?? 0,
                    },
                    {
                      label: "Needs RSVP",
                      value: districtHosted?.invitations_pending ?? 0,
                    },
                    {
                      label: "Going",
                      value: districtHosted?.going_count ?? 0,
                    },
                    {
                      label: "Attended",
                      value: districtHosted?.attended_this_season ?? 0,
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-xs font-semibold text-muted">
                        {stat.label}
                      </dt>
                      <dd className="mt-1 font-display text-xl font-bold text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {!districtRollup.length ? (
                <section className="section-rule mt-8 pt-8">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Add a school for school-level reporting
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    No school workspaces are connected. District-hosted totals
                    remain separate above.{" "}
                    <Link
                      href={`/orgs/${view.org.slug}/settings#schools`}
                      className="font-semibold text-brand-red hover:underline"
                    >
                      Create a school workspace
                    </Link>
                    .
                  </p>
                </section>
              ) : (
                <section className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
                  <table className="w-full min-w-[48rem] text-left text-sm">
                    <caption className="sr-only">
                      School-hosted participation totals for schools in{" "}
                      {view.org.name}
                    </caption>
                    <thead className="border-b border-line bg-surface-soft text-xs text-muted-strong">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">School</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Students</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Upcoming</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Needs RSVP</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Going</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Attended</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {districtRollup.map((school) => (
                        <tr key={school.school_id}>
                          <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                            {school.school_name}
                          </th>
                          <td className="px-4 py-3 text-muted-strong">
                            {school.active_students}
                          </td>
                          <td className="px-4 py-3 text-muted-strong">
                            {school.upcoming_tournaments}
                          </td>
                          <td className="px-4 py-3 text-muted-strong">
                            {school.invitations_pending}
                          </td>
                          <td className="px-4 py-3 text-muted-strong">
                            {school.going_count}
                          </td>
                          <td className="px-4 py-3 text-muted-strong">
                            {school.attended_this_season}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section className="section-rule mt-8 pt-8">
                <h2 className="font-display text-xl font-bold text-foreground">
                  District-hosted by participating school
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  These counts use the school recorded when the student was
                  invited. Students without a recorded school stay in the
                  district-hosted totals above, not in this table.
                </p>
                {!hostedBySchool.length ? (
                  <p className="mt-4 text-sm text-muted">
                    No participating-school origin has been recorded on
                    district-hosted invitations yet.
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
                    <table className="w-full min-w-[36rem] text-left text-sm">
                      <caption className="sr-only">
                        District-hosted invitations grouped by participating
                        school of origin for {view.org.name}
                      </caption>
                      <thead className="border-b border-line bg-surface-soft text-xs text-muted-strong">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            School
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Needs RSVP
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Going
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Attended
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {hostedBySchool.map((school) => (
                          <tr key={school.school_id}>
                            <th
                              scope="row"
                              className="px-4 py-3 font-semibold text-foreground"
                            >
                              {school.school_name}
                            </th>
                            <td className="px-4 py-3 text-muted-strong">
                              {school.invitations_pending}
                            </td>
                            <td className="px-4 py-3 text-muted-strong">
                              {school.going_count}
                            </td>
                            <td className="px-4 py-3 text-muted-strong">
                              {school.attended_this_season}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        ) : attendanceError ? (
          <PortalErrorState
            title="Season attendance could not load"
            description="No totals or CSV were generated. Retry before using attendance numbers."
            action={{
              href: `/orgs/${view.org.slug}/reports?retry=attendance`,
              label: "Retry season attendance",
            }}
          />
        ) : (
          <>
            <dl className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              {[
                { label: "Attendance marked", value: attendance.length },
                { label: "Attended", value: attended },
                { label: "Did not attend", value: absent },
              ].map((stat) => (
                <div key={stat.label} className="border-l-2 border-brand-red pl-3">
                  <dt className="text-xs font-semibold text-muted">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-display text-xl text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            <section className="section-rule mt-8 pt-8">
              <h2 className="text-sm font-semibold text-foreground">
                Recorded outcomes
              </h2>
              {!attendance.length ? (
                <PortalEmptyState
                  title="No attendance has been recorded"
                  description={`Attendance appears here after a coach marks outcomes on a past hosted event or a public event this ${orgKind} marked as attending.`}
                  action={{
                    href: orgCompetitionsHref(view.org.slug),
                    label: OPEN_COMPETITIONS_LABEL,
                  }}
                />
              ) : (
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {attendance.map((row) => {
                    const recorded = formatRecordedResult({
                      placement: row.placement,
                      awardLabel: row.award_label,
                      sectionName: row.section_name,
                    });
                    return (
                    <li
                      key={`${row.competition_id}-${row.profile_id}`}
                      className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                    >
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {row.display_name || "Student"}
                        </strong>{" "}
                        · {row.name}
                        {row.hosted ? "" : " · travel"}
                        {row.start_date
                          ? ` · ${formatDateRange(row.start_date, null)}`
                          : ""}
                      </span>
                      <span className="text-xs font-semibold text-muted-strong">
                        {row.status === "attended" ? "Attended" : "Did not attend"}
                        {recorded
                          ? ` · ${recorded}`
                          : row.status === "attended"
                            ? " · result not recorded"
                            : ""}
                      </span>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
