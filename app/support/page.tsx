import type { Metadata } from "next";
import Link from "next/link";
import { PageBackLink } from "@/components/PageBackLink";
import { SupportReportForm } from "@/components/SupportReportForm";
import { SupportReportThread } from "@/components/SupportReportThread";
import { getSessionUser } from "@/lib/auth/session";
import { getMySupportReports } from "@/lib/data/support";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Report a problem on Causey, or reach the founding team about an account, listing, or the phone app.",
};

export default async function SupportPage() {
  const user = await getSessionUser();
  const reports = user ? await getMySupportReports() : { reports: [], error: null };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <PageBackLink />
      <p className="mt-6 text-sm font-semibold text-brand-red">Trust</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Support
      </h1>
      <p className="mt-4 max-w-2xl text-md text-muted">
        Causey is an early build. Use this page if something is broken, you
        cannot sign in, need an account deleted, or need to report a listing or
        comment.
      </p>

      <div className="mt-10 space-y-10">
        <section aria-labelledby="report">
          <h2
            id="report"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Report a problem
          </h2>
          <p className="mt-4 text-base text-muted">
            This is not a live chat. Describe what went wrong and add a
            screenshot if it helps. The founding team gets the report by email.
            If you have a Causey account, replies also show in{" "}
            <Link href="/me/notifications" className="font-semibold text-brand-red hover:underline">
              Alerts
            </Link>
            . Do not send passwords or student records.
          </p>
          <div className="mt-6">
            <SupportReportForm initialEmail={user?.email ?? ""} />
          </div>
        </section>

        {user ? (
          <section aria-labelledby="reports">
            <h2
              id="reports"
              className="font-display text-display-sm font-bold tracking-tight text-foreground"
            >
              Your reports
            </h2>
            {reports.error ? (
              <p className="mt-4 text-base text-muted">{reports.error}</p>
            ) : reports.reports.length === 0 ? (
              <p className="mt-4 text-base text-muted">
                Reports you send while signed in appear here with any replies.
              </p>
            ) : (
              <div className="mt-4">
                {reports.reports.map((report) => (
                  <SupportReportThread
                    key={report.id}
                    report={report}
                    viewer="reporter"
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section aria-labelledby="account">
          <h2
            id="account"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Account and deletion
          </h2>
          <p className="mt-4 text-base text-muted">
            You can export or delete your own account from{" "}
            <Link href="/account#data" className="font-semibold text-brand-red hover:underline">
              Account
            </Link>{" "}
            after signing in on the website. Organization owners must transfer
            ownership first.
          </p>
        </section>

        <section aria-labelledby="age">
          <h2
            id="age"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Ages 13 and up
          </h2>
          <p className="mt-4 text-base text-muted">
            The Causey phone app is for people 13 and older. It is not a kids
            app. Students under 13 should not sign in on a phone; a parent can
            use a parent account. Create accounts on the website.
          </p>
        </section>
      </div>
    </div>
  );
}
