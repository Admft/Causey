import Link from "next/link";
import type { PathwayStatus } from "@/lib/schemas";
import { PathwayList } from "@/components/PathwayList";
import type { PathwayNode } from "@/lib/qualification";

type Related = { name: string; note?: string };

/**
 * Organized pathway panel: none / uncertain / known.
 * Graph unlocks (curated rules) show when present; enrichment fills the gaps.
 */
export function PathwayStatusPanel({
  status,
  summary,
  related,
  unlocks,
  sourceUrl,
}: {
  status: PathwayStatus;
  summary: string | null | undefined;
  related: Related[] | null | undefined;
  unlocks: PathwayNode[];
  sourceUrl: string | null;
}) {
  const relatedList = related ?? [];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
      <h2 className="text-lead font-semibold text-foreground">
        What winning here unlocks
      </h2>

      <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
        {status === "known"
          ? "Pathway on record"
          : status === "uncertain"
            ? "Unconfirmed"
            : "No pathway in our data"}
      </p>

      {status === "none" && (
        <p className="mt-3 text-sm text-muted">
          {summary ??
            "No qualification pathway in our data. Most tournaments are open entry — invitational chains usually start at regionals and state championships."}
        </p>
      )}

      {status === "uncertain" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted">
            {summary ??
              "We are not sure whether this event feeds a qualifier. Check the organizer site before relying on a pathway."}
          </p>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-semibold text-brand-red transition-colors hover:text-brand-red-hover"
              aria-label="Check organizer site for pathway details — opens in a new tab"
            >
              Check the organizer site <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      )}

      {status === "known" && (
        <div className="mt-3 space-y-4">
          {summary ? <p className="text-sm text-muted">{summary}</p> : null}
          {unlocks.length > 0 ? (
            <PathwayList nodes={unlocks} />
          ) : relatedList.length > 0 ? (
            <ul className="space-y-2">
              {relatedList.map((item) => (
                <li key={item.name} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  {item.note ? (
                    <p className="mt-0.5 text-xs text-muted">{item.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Linked to a known series. Confirm placement rules on the organizer
              site.
            </p>
          )}
        </div>
      )}

      {status !== "known" && unlocks.length > 0 ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs font-semibold text-muted-strong">Curated unlock graph</p>
          <div className="mt-2">
            <PathwayList nodes={unlocks} />
          </div>
        </div>
      ) : null}

      <p className="mt-4 border-t border-line pt-3 text-2xs text-muted">
        Pathway notes are early and may be wrong. Always confirm with the
        organizer before traveling or registering for a qualifier seat.
      </p>
      <Link
        href="/pathways"
        className="mt-3 inline-block text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
      >
        Explore qualification pathways
      </Link>
    </div>
  );
}
