import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminModerationBulkQueue } from "@/components/AdminModerationBulkQueue";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminModerationQueue } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Competition moderation",
  description: "Review organizer-submitted public competitions before discovery.",
};

export default async function ModerationPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const { queue, error } = await getAdminModerationQueue();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Public competition review
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Organizer listings remain private until the source, audience, and event
        details have been reviewed. Approved chess listings enter chess search;
        other competition types get a public link but remain unsearchable.
        Select several and approve or reject them together.
      </p>

      {error ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Review queue unavailable
          </h2>
          <p className="mt-2 text-sm text-muted" role="alert">
            {error}{" "}
            <Link
              href="/admin/moderation"
              className="font-semibold text-brand-red hover:underline"
            >
              Try loading it again
            </Link>
            .
          </p>
        </section>
      ) : !queue.length ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Review queue is clear
          </h2>
          <p className="mt-2 text-sm text-muted">
            New public submissions will appear here.{" "}
            <Link
              href="/admin/tournaments"
              className="font-semibold text-brand-red hover:underline"
            >
              Browse all competition records
            </Link>
            .
          </p>
        </section>
      ) : (
        <AdminModerationBulkQueue
          queue={queue.map((tournament) => ({
            id: tournament.id,
            slug: tournament.slug,
            name: tournament.name,
            category: tournament.category,
            custom_category_name: tournament.custom_category_name,
            participation_mode: tournament.participation_mode,
            organizer_name: tournament.organizer_name,
            venue_name: tournament.venue_name,
            city: tournament.city,
            state: tournament.state,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
            reg_deadline: tournament.reg_deadline,
            reg_url: tournament.reg_url,
            entry_fee_cents: tournament.entry_fee_cents,
            rated: tournament.rated,
            audience: tournament.audience,
            source: tournament.source,
            submitted_for_review_at: tournament.submitted_for_review_at,
            organizations: tournament.organizations
              ? {
                  name: tournament.organizations.name,
                  verification_status:
                    tournament.organizations.verification_status,
                }
              : null,
          }))}
        />
      )}
    </main>
  );
}
