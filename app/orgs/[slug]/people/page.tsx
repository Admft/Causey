import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrganizationPeopleManager } from "@/components/OrganizationPeopleManager";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { getSessionUser } from "@/lib/auth/session";
import { getOrgInvitations } from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Invites and staff",
  description: "Provision students and delegate organization staff safely.",
};

export default async function OrganizationPeoplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/people`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);
  const invitations = await getOrgInvitations(view.org.id);

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="people"
        showRoster={view.isCoach}
        showAdmin={view.isAdmin}
      />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">People</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Invite without sharing passwords
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Invite one person or import a CSV. Every recipient claims their own
          account through an expiring email link, and you can see what is still
          pending.
        </p>
        <section className="section-rule mt-8 pt-8">
          <OrganizationPeopleManager
            orgId={view.org.id}
            orgSlug={view.org.slug}
            orgType={view.org.type}
            invitations={invitations}
          />
        </section>
      </main>
    </>
  );
}
