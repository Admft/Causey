import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminScraperControls } from "@/components/AdminScraperControls";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminScrapeRuns } from "@/lib/data/admin";
import { getGitHubIngestionConfig } from "@/lib/github-ingestion";

export const metadata: Metadata = {
  title: "Admin scrapers",
  description: "Run tournament ingestion sources and inspect recent results.",
};

export default async function AdminScrapersPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [runs, github] = await Promise.all([
    getAdminScrapeRuns(),
    Promise.resolve(getGitHubIngestionConfig()),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Scrapers
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sources are grouped by competition type. Select one source, a whole
        category, or several at once; each request uses the existing ingestion
        workflow and records its result separately.
      </p>

      <div className="mt-8">
        <AdminScraperControls
          runs={runs}
          configured={github.ok}
          workflowUrl={github.ok ? github.config.workflowUrl : github.workflowUrl}
        />
      </div>
    </main>
  );
}
