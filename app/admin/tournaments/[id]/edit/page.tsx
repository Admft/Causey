import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminTournamentStatusActions } from "@/components/AdminTournamentStatusActions";
import { PageBackLink } from "@/components/PageBackLink";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminTournament } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Edit tournament",
  description: "Edit tournament metadata and publication status.",
};

export default async function AdminEditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const { id } = await params;
  const tournament = await getAdminTournament(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageBackLink href="/admin/tournaments">Tournaments</PageBackLink>
      <p className="mt-6 text-sm font-semibold text-brand-red">Platform admin</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
            Edit {tournament.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {tournament.source} · {tournament.status}
            {tournament.organizations
              ? ` · ${tournament.organizations.name}`
              : " · no Causey organization"}
          </p>
        </div>
        <AdminTournamentStatusActions
          competitionId={tournament.id}
          eventSlug={tournament.slug}
          status={tournament.status}
        />
      </div>

      <div className="section-rule mt-8 pt-8">
        <TournamentCreateForm
          orgId={
            tournament.org_id ?? "00000000-0000-0000-0000-000000000000"
          }
          orgSlug={tournament.organizations?.slug ?? "platform-admin"}
          orgName={tournament.organizations?.name ?? ""}
          orgState={tournament.organizations?.state ?? tournament.state}
          orgType={tournament.organizations?.type}
          parentOrgId={tournament.organizations?.parent_org_id ?? null}
          initial={{
            category: tournament.category,
            custom_category_name: tournament.custom_category_name,
            participation_mode: tournament.participation_mode,
            name: tournament.name,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
            reg_deadline: tournament.reg_deadline,
            venue_name: tournament.venue_name,
            address: tournament.address,
            city: tournament.city,
            state: tournament.state,
            zip: tournament.zip,
            entry_fee_cents: tournament.entry_fee_cents,
            reg_url: tournament.reg_url,
            visibility: tournament.visibility,
            audience: tournament.audience,
            rated: tournament.rated,
            facets: tournament.details?.facets,
            image_url: tournament.image_url,
            sections: tournament.sections?.map((section) => ({
              name: section.name,
              minRating: section.min_rating,
              maxRating: section.max_rating,
              minGrade: section.min_grade,
              maxGrade: section.max_grade,
              entryFeeCents: section.entry_fee_cents,
            })),
          }}
          edit={{
            competitionId: tournament.id,
            eventSlug: tournament.slug,
          }}
          admin
          returnTo="/admin/tournaments"
        />
      </div>
    </div>
  );
}
