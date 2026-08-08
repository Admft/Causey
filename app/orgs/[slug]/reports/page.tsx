import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { getSessionUser } from "@/lib/auth/session";
import {
  getDistrictSchoolRollup,
  getOrgSeasonAttendance,
} from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Organization reporting",
  description: "Review participation and attendance without exposing browsing data.",
};

export default async function OrganizationReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/reports`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);

  const [districtRollup, attendance] = await Promise.all([
    view.isDistrictAdmin
      ? getDistrictSchoolRollup(view.org.id)
      : Promise.resolve([]),
    view.org.type === "district"
      ? Promise.resolve([])
      : getOrgSeasonAttendance(view.org.id),
  ]);
  const attended = attendance.filter((row) => row.status === "attended").length;
  const absent = attendance.filter((row) => row.status === "did_not_attend").length;

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="reports"
        showRoster={view.isCoach && view.org.type !== "district"}
        showAdmin={view.isAdmin}
      />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">Reporting</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {view.isDistrictAdmin ? "Participation by school" : "Season attendance"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {view.isDistrictAdmin
            ? "This view stays aggregate by default. It does not expose students’ private searches, saves, or browsing activity."
            : "Review attendance outcomes for organization-hosted tournaments this calendar year."}
        </p>

        {view.isDistrictAdmin ? (
          !districtRollup.length ? (
            <section className="section-rule mt-8 pt-8">
              <h2 className="font-display text-xl font-bold text-foreground">
                Add a school before reporting
              </h2>
              <p className="mt-2 text-sm text-muted">
                District totals appear after school workspaces are connected.{" "}
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
                <thead className="border-b border-line bg-surface-soft text-xs text-muted-strong">
                  <tr>
                    <th className="px-4 py-3 font-semibold">School</th>
                    <th className="px-4 py-3 font-semibold">Students</th>
                    <th className="px-4 py-3 font-semibold">Upcoming</th>
                    <th className="px-4 py-3 font-semibold">Needs RSVP</th>
                    <th className="px-4 py-3 font-semibold">Going</th>
                    <th className="px-4 py-3 font-semibold">Attended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {districtRollup.map((school) => (
                    <tr key={school.school_id}>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {school.school_name}
                      </td>
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
          )
        ) : (
          <>
            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Attendance marked", value: attendance.length },
                { label: "Attended", value: attended },
                { label: "Did not attend", value: absent },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <dt className="text-xs font-semibold text-muted">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 font-display text-display-sm font-bold text-foreground">
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
                <p className="mt-3 text-sm text-muted">
                  No attendance has been marked yet. Open a past hosted
                  tournament and record who attended.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {attendance.map((row) => (
                    <li
                      key={`${row.competition_id}-${row.profile_id}`}
                      className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                    >
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {row.profiles?.display_name ?? "Student"}
                        </strong>{" "}
                        · {row.competitions?.name ?? "Tournament"}
                      </span>
                      <span className="text-xs font-semibold text-muted-strong">
                        {row.status === "attended" ? "Attended" : "Did not attend"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
