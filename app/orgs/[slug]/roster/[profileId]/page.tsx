import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PageBackLink } from "@/components/PageBackLink";
import { PortalMission } from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import { competitionTypeLabel } from "@/lib/competition-types";
import {
  getOrgBySlugForViewer,
  getOrgMemberCompetitionHistory,
  getOrgRoster,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { formatDateRange, formatRecordedResult, gradeLabel } from "@/lib/format";
import { organizationKindLabel } from "@/lib/portal-copy";
import { rsvpLabel } from "@/lib/rsvp";
import { CompetitionCategorySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student competition history",
  description: "Club-scoped events this student entered, attended, or placed in.",
};

export default async function RosterMemberHistoryPage({
  params,
}: {
  params: Promise<{ slug: string; profileId: string }>;
}) {
  const { slug, profileId } = await params;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/roster/${profileId}`);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      profileId
    )
  ) {
    notFound();
  }

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (view.org.type === "district") {
    redirect(`/orgs/${slug}/settings#schools`);
  }
  if (!view.isCoach && user.id !== profileId) redirect(`/orgs/${slug}`);

  const { org } = view;
  const orgKind = organizationKindLabel(org.type);
  const [roster, history] = await Promise.all([
    getOrgRoster(org.id),
    getOrgMemberCompetitionHistory(org.id, profileId),
  ]);
  const member = roster.find((row) => row.profile_id === profileId);
  if (!member && user.id !== profileId) notFound();

  const displayName = member?.display_name || "This student";
  const today = new Date().toISOString().slice(0, 10);
  const pastMissingResult = history.filter(
    (row) =>
      row.status === "attended" &&
      !isUpcomingEvent(row, today) &&
      row.placement == null &&
      !row.award_label &&
      !row.section_name
  );
  const firstMissing = pastMissingResult[0];
  const credentials = member?.credential_ids ?? {};
  const credentialBits = [
    credentials.uscf ? `USCF ${credentials.uscf}` : null,
    credentials.nsda ? `NSDA ${credentials.nsda}` : null,
    credentials.other ? credentials.other : null,
  ].filter(Boolean);

  const mission = firstMissing
    ? {
        title: "Record a result",
        description: `${displayName} attended ${firstMissing.name} without a recorded place or award. Absence means not recorded, not that they did not place.`,
        action: {
          href: `/event/${firstMissing.slug}/manage`,
          label: "Record a result",
        },
        secondary: {
          href: `/orgs/${org.slug}/roster`,
          label: "Back to roster",
        },
      }
    : {
        title: history.length
          ? `${orgKind === "team" ? "Team" : orgKind === "school" ? "School" : "Club"} competition history`
          : `No ${orgKind} events yet`,
        description: history.length
          ? `Events this ${orgKind} hosted or marked as attending. Results appear when a coach records them.`
          : "Invite this student to a competition, then attendance and results show up here.",
        action: history.length
          ? { href: `/orgs/${org.slug}/roster`, label: "Back to roster" }
          : {
              href: `/orgs/${org.slug}/competitions`,
              label: "Open competitions",
            },
        secondary: history.length
          ? undefined
          : { href: `/orgs/${org.slug}/roster`, label: "Back to roster" },
      };

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="roster"
        showRoster
        showAdmin={view.isAdmin}
        orgType={org.type}
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <PageBackLink href={`/orgs/${org.slug}/roster`}>Roster</PageBackLink>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-red">
          Club record
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {displayName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {member?.age_band ? `${member.age_band} · ` : ""}
          {typeof member?.grade === "number"
            ? `Grade ${gradeLabel(member.grade)} · `
            : ""}
          {credentialBits.length ? `${credentialBits.join(" · ")} · ` : ""}
          Visible to {org.name} staff, this student, and a linked parent.
        </p>

        <div className="mt-8">
          <PortalMission
            title={mission.title}
            description={mission.description}
            action={mission.action}
            secondary={mission.secondary}
          />
        </div>

        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">
            Competitions
          </h2>
          {!history.length ? (
            <p className="mt-3 text-sm text-muted">
              No hosted or club-attending events for this person yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {history.map((row) => {
                const recorded = formatRecordedResult({
                  placement: row.placement,
                  awardLabel: row.award_label,
                  sectionName: row.section_name,
                });
                const past = !isUpcomingEvent(row, today);
                return (
                  <li key={row.competition_id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/event/${row.slug}`}
                        className="text-sm font-semibold text-foreground hover:text-brand-red"
                      >
                        {row.name}
                      </Link>
                      {view.canManageTournaments &&
                      past &&
                      row.status === "attended" &&
                      !recorded ? (
                        <Link
                          href={`/event/${row.slug}/manage`}
                          className="text-sm font-semibold text-brand-red hover:underline"
                        >
                          Record a result
                        </Link>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {competitionTypeLabel({
                        category: CompetitionCategorySchema.safeParse(
                          row.category
                        ).success
                          ? CompetitionCategorySchema.parse(row.category)
                          : "other",
                      })}
                      {" · "}
                      {formatDateRange(row.start_date, row.end_date)}
                      {" · "}
                      {rsvpLabel(row.status)}
                      {recorded
                        ? ` · ${recorded}`
                        : row.status === "attended"
                          ? " · result not recorded"
                          : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
