import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GroupManager } from "@/components/GroupManager";
import { JoinCodePanel } from "@/components/JoinCodePanel";
import { OrgSubnavBar } from "@/components/OrgSubnav";
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
  if (!view.isCoach) redirect(`/orgs/${slug}`);
  const { org } = view;

  const [roster, groups] = await Promise.all([
    getOrgRoster(org.id),
    getOrgGroups(org.id),
  ]);
  const activeMembers = roster.filter((row) => row.member_status === "active");

  return (
    <>
      <OrgSubnavBar slug={org.slug} orgName={org.name} tab="roster" showRoster />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">Roster</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {activeMembers.length} active{" "}
          {activeMembers.length === 1 ? "member" : "members"}.{" "}
          {org.join_code
            ? "Share the join link below, then organize students into groups."
            : "Students appear here when they join your organization."}
        </p>

        {org.join_code ? (
          <section className="section-rule mt-8 pt-8">
            <h2 className="text-sm font-semibold text-foreground">
              Add students
            </h2>
            <div className="mt-4">
              <JoinCodePanel
                orgId={org.id}
                orgSlug={org.slug}
                joinCode={org.join_code}
              />
            </div>
          </section>
        ) : null}

        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
          {!roster.length ? (
            <p className="mt-3 text-sm text-muted">
              {org.join_code
                ? "No roster members yet. Copy the join link above and send it to students."
                : "No roster members have joined yet."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {roster.map((row) => (
                <li
                  key={row.profile_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {row.display_name || "Unnamed student"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {row.age_band ? `${ageBandLabel(row.age_band as AgeBand)} · ` : ""}
                      {row.member_role === "student" ? "Student" : "Coach"}
                      {` · joined ${formatDate(row.joined_at.slice(0, 10))}`}
                    </span>
                  </div>
                  {row.profile_id !== user.id ? (
                    <RemoveMemberButton
                      orgId={org.id}
                      orgSlug={org.slug}
                      profileId={row.profile_id}
                      displayName={row.display_name || "this member"}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Groups</h2>
          <div className="mt-4">
            <GroupManager
              orgId={org.id}
              orgSlug={org.slug}
              groups={groups}
              roster={activeMembers.map((row) => ({
                profile_id: row.profile_id,
                display_name: row.display_name,
              }))}
            />
          </div>
        </section>
      </div>
    </>
  );
}
