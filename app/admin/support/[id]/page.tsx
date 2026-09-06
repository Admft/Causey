import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AdminSupportCloseButton,
  AdminSupportReplyForm,
} from "@/components/AdminSupportReplyForm";
import { SupportReportThread } from "@/components/SupportReportThread";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminSupportReport } from "@/lib/data/support";

export const metadata: Metadata = {
  title: "Problem report",
  description: "Read a Support problem report and send a reply.",
};

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const { id } = await params;
  const { report, error } = await getAdminSupportReport(id);
  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">Platform admin</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          That report isn&rsquo;t in this queue
        </h1>
        <p className="mt-4 text-base text-muted" role="alert">
          {error ?? "That report was not found."} Reply from Admin → Support
          on the Causey site that saved the ticket. The email button always
          opens causey.dev.
        </p>
        <p className="mt-6">
          <Link
            href="/admin/support"
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            All problem reports
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <p className="mt-2">
        <Link
          href="/admin/support"
          className="text-sm font-semibold text-brand-red hover:underline"
        >
          All problem reports
        </Link>
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Problem report
      </h1>
      <SupportReportThread report={report} viewer="staff" />
      {report.status === "closed" ? (
        <p className="mt-8 text-sm text-muted">This report is closed.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <AdminSupportReplyForm reportId={report.id} />
          <AdminSupportCloseButton reportId={report.id} />
        </div>
      )}
    </div>
  );
}
