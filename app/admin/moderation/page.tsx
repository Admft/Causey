import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBarChart, AdminMixChart } from "@/components/AdminCharts";
import { AdminModerationBulkQueue } from "@/components/AdminModerationBulkQueue";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { adminTournamentsHref } from "@/lib/admin-tournament-filters";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import type { AdminChartSegment } from "@/lib/admin-charts";
import {
  getAdminModerationQueue,
  getAdminOpsStats,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Competition moderation",
  description: "Review organizer-submitted public competitions before discovery.",
};

export default async function ModerationPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [{ queue, error }, stats] = await Promise.all([
    getAdminModerationQueue(),
    getAdminOpsStats(["listings"]),
  ]);

  const categoryCounts = Object.fromEntries(
    [...DISCOVERY_CATEGORIES.map((category) => category.id), "other"].map(
      (id) => [id, 0]
    )
  ) as Record<string, number>;
  if (!error) {
    for (const row of queue) {
      const key = row.category in categoryCounts ? row.category : "other";
      categoryCounts[key] += 1;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Public competition review
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Organizer listings remain private until the source, audience, and event
        details have been reviewed. Approved public listings enter the matching
        category directory. Coverage notices remain visible because each
        non-chess directory currently has only limited official sources. Select
        several and approve or reject them together.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Moderation"
          items={[
            {
              label: "Awaiting review",
              value: stats.listings.pendingReview,
              href: "/admin/moderation",
            },
            {
              label: "Rejected listings",
              value: stats.listings.rejected,
              href: adminTournamentsHref({ status: "rejected" }),
            },
            {
              label: "Published organizer listings",
              value: stats.listings.publishedOrganizer,
              href: adminTournamentsHref({
                status: "published",
                source: "organizer",
              }),
            },
          ]}
          chart={
            <div className="grid gap-6 sm:grid-cols-2">
              <AdminMixChart
                title="Organizer pipeline"
                segments={[
                  {
                    label: "Awaiting",
                    value: stats.listings.pendingReview,
                    tone: "attention",
                  },
                  {
                    label: "Rejected",
                    value: stats.listings.rejected,
                    tone: "progress",
                  },
                  {
                    label: "Published",
                    value: stats.listings.publishedOrganizer,
                    tone: "ok",
                  },
                ]}
              />
              <AdminBarChart
                title="Waiting by type"
                segments={[
                  ...DISCOVERY_CATEGORIES.map(
                    (category): AdminChartSegment => ({
                      label: category.shortLabel,
                      value: error ? null : categoryCounts[category.id],
                      tone: category.id === "chess" ? "ok" : "quiet",
                    })
                  ),
                  {
                    label: "Other",
                    value: error ? null : categoryCounts.other,
                    tone: "quiet",
                  },
                ]}
              />
            </div>
          }
        />
      </div>

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
    </div>
  );
}
