import type { SupportReportRecord } from "@/lib/data/support";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: SupportReportRecord["status"]) {
  if (status === "open") return "Open";
  if (status === "replied") return "Replied";
  return "Closed";
}

export function SupportReportThread({
  report,
  viewer,
}: {
  report: SupportReportRecord;
  viewer: "reporter" | "staff";
}) {
  return (
    <article className="section-rule pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {statusLabel(report.status)} · {formatWhen(report.createdAt)}
      </p>
      {viewer === "staff" ? (
        <p className="mt-1 text-sm text-muted">{report.reporterEmail}</p>
      ) : null}
      {report.pageLabel ? (
        <p className="mt-1 text-sm text-muted">Page: {report.pageLabel}</p>
      ) : null}
      {report.attachmentUrl ? (
        <p className="mt-3">
          <img
            src={report.attachmentUrl}
            alt="Screenshot attached to this report"
            className="max-h-80 rounded-xl border border-line"
          />
        </p>
      ) : null}
      <ol className="mt-4 grid gap-3">
        {report.messages.map((message) => (
          <li key={message.id}>
            <p className="text-xs font-semibold text-muted-strong">
              {message.authorRole === "staff"
                ? "Causey"
                : viewer === "staff"
                  ? report.reporterEmail
                  : "You"}{" "}
              · {formatWhen(message.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {message.body}
            </p>
          </li>
        ))}
      </ol>
    </article>
  );
}
