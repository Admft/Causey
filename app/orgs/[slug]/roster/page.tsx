import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GroupManager } from "@/components/GroupManager";
import { JoinCodePanel } from "@/components/JoinCodePanel";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalMission } from "@/components/PortalPrimitives";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { ageBandLabel } from "@/lib/auth/age-band";
import type { AgeBand } from "@/lib/auth/types";
import { getSessionUser } from "@/lib/auth/session";
import {
  getOrgBySlugForViewer,
  getOrgGroups,
  getOrgRoster,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roster & groups",
  description: "Manage your organization's members and groups.",
};

function roleLabel(role: string) {
  if (role === "student") return "Student";
  if (role === "assistant_coach") return "Assistant coach";
  if (role === "school_admin" || role === "district_admin" || role === "admin") {
    return "Admin";
  }
  return "Coach";
}

export default async function RosterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/roster`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (view.org.type === "district") {
    redirect(`/orgs/${slug}/settings#schools`);
  }
  if (!view.isCoach) redirect(`/orgs/${slug}`);
  const { org } = view;

  const [roster, groups] = await Promise.all([
    getOrgRoster(org.id),
    getOrgGroups(org.id),
  ]);
  const activeMembers = roster.filter((row) => row.member_status === "active");
  const students = activeMembers.filter((row) => row.member_role === "student");
  const staff = activeMembers.filter((row) => row.member_role !== "student");
  const emptyRoster = activeMembers.length === 0;
  const canOperate = view.canManageTournaments;

  const mission = !canOperate
    ? {
        title: "Review the roster",
        description:
          "Assistant coaches can review students and groups. A coach or administrator handles invitations, roster changes, and tournament operations.",
        action: { href: `/orgs/${org.slug}`, label: "Back to workspace" },
      }
    : emptyRoster
      ? {
        title: "Add your first students",
        description: org.join_code
          ? "Share the join link, then come back to put students into groups for tournament invites."
          : "Students appear here when they join. Ask an admin for a join code if you don’t have one.",
        action: org.join_code
          ? { href: "#add-students", label: "Copy join link" }
          : { href: `/orgs/${org.slug}`, label: "Back to workspace" },
      }
      : groups.length === 0
        ? {
          title: "Create a group for invites",
          description:
            "Groups let you invite Varsity, JV, or a grade in one tap when you manage a tournament.",
          action: { href: "#groups", label: "Create a group" },
          secondary: org.join_code
            ? { href: "#add-students", label: "Invite more students" }
            : undefined,
        }
        : {
          title: "Roster is ready for tournaments",
          description: `${students.length} ${
            students.length === 1 ? "student" : "students"
          } on the roster${
            groups.length
              ? ` · ${groups.length} ${groups.length === 1 ? "group" : "groups"}`
              : ""
          }. Open a tournament to invite them.`,
          action: {
            href: `/orgs/${org.slug}`,
            label: "Back to workspace",
          },
          secondary: org.join_code
            ? { href: "#add-students", label: "Invite more students" }
            : undefined,
        };

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="roster"
        showRoster
        showAdmin={view.isAdmin}
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          Roster
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Students for invites and groups. Staff stay quieter below.
        </p>

        <div className="mt-8">
          <PortalMission
            title={mission.title}
            description={mission.description}
            action={mission.action}
            secondary={mission.secondary}
          />
        </div>

        {canOperate && org.join_code ? (
          <section id="add-students" className="section-rule mt-10 scroll-mt-24 pt-8">
            <h2 className="text-sm font-semibold text-foreground">
              Add students
            </h2>
            <p className="mt-1 text-sm text-muted">
              Share this once — students create their own accounts when they join.
            </p>
            <div className="mt-4">
              <JoinCodePanel
                orgId={org.id}
                orgSlug={org.slug}
                joinCode={org.join_code}
              />
            </div>
          </section>
        ) : null}

        <section id="students" className="section-rule mt-10 scroll-mt-24 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Students</h2>
            <p className="text-xs text-muted">
              {students.length} active
            </p>
          </div>
          {!students.length ? (
            <p className="mt-3 text-sm text-muted">
              {org.join_code
                ? "No students yet. Copy the join link above and send it to families."
                : "No students have joined yet."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {students.map((row) => (
                <li
                  key={row.profile_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {row.display_name || "Unnamed student"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.age_band
                        ? ageBandLabel(row.age_band as AgeBand)
                        : "Age not set"}
                      {` · joined ${formatDate(row.joined_at.slice(0, 10))}`}
                    </p>
                  </div>
                  {canOperate ? (
                    <RemoveMemberButton
                      orgId={org.id}
                      orgSlug={org.slug}
                      profileId={row.profile_id}
                      displayName={row.display_name || "this student"}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="groups" className="section-rule mt-10 scroll-mt-24 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Groups</h2>
          <p className="mt-1 text-sm text-muted">
            Optional. Use groups to invite a subset of students to a tournament
            in one step.
          </p>
          {canOperate ? (
            <div className="mt-4">
              <GroupManager
                orgId={org.id}
                orgSlug={org.slug}
                groups={groups}
                roster={students.map((row) => ({
                  profile_id: row.profile_id,
                  display_name: row.display_name,
                }))}
              />
            </div>
          ) : groups.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {group.name}
                  </span>
                  <span className="text-xs text-muted">
                    {group.member_ids.length}{" "}
                    {group.member_ids.length === 1 ? "student" : "students"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No groups yet. A coach or administrator can create them.
            </p>
          )}
        </section>

        {staff.length ? (
          <section className="section-rule mt-10 pt-8">
            <h2 className="text-sm font-semibold text-muted-strong">Staff</h2>
            <p className="mt-1 text-sm text-muted">
              Coaches and admins — not invited as tournament entrants.
            </p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {staff.map((row) => (
                <li
                  key={row.profile_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {row.display_name || "Unnamed staff"}
                      {row.profile_id === user.id ? " (you)" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {roleLabel(row.member_role)}
                    </p>
                  </div>
                  {canOperate && row.profile_id !== user.id ? (
                    <RemoveMemberButton
                      orgId={org.id}
                      orgSlug={org.slug}
                      profileId={row.profile_id}
                      displayName={row.display_name || "this member"}
                    />
                  ) : (
                    <Link
                      href={`/orgs/${org.slug}`}
                      className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                    >
                      Workspace
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
