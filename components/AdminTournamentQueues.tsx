import Link from "next/link";
import { formatAdminCount } from "@/components/AdminStatStrip";
import {
  adminTournamentQueue,
  adminTournamentQueueHref,
  type AdminTournamentListFilters,
  type AdminTournamentQueue,
} from "@/lib/admin-tournament-filters";
import type { AdminCount } from "@/lib/data/admin";

type QueueCard = {
  id: "review" | "ready" | "archived";
  title: string;
  description: string;
  count: AdminCount;
  action: string;
};

export function AdminTournamentQueues({
  filters,
  pendingReview,
  readyToPublish,
  archived,
  published,
  needsDetails,
  rejected,
}: {
  filters: AdminTournamentListFilters;
  pendingReview: AdminCount;
  readyToPublish: AdminCount;
  archived: AdminCount;
  published: AdminCount;
  needsDetails: AdminCount;
  rejected: AdminCount;
}) {
  const current = adminTournamentQueue(filters);
  const cards: QueueCard[] = [
    {
      id: "review",
      title: "Needs review",
      description:
        "Organizer submissions stay out of discovery until you approve or send them back.",
      count: pendingReview,
      action: "Open this queue",
    },
    {
      id: "ready",
      title: "Ready to publish",
      description:
        "Drafts with a usable place and registration link. These can go public.",
      count: readyToPublish,
      action: "Open this queue",
    },
    {
      id: "archived",
      title: "Archived",
      description:
        "Off the public directories. Complete records can be restored.",
      count: archived,
      action: "Open this queue",
    },
  ];

  const browse: { id: AdminTournamentQueue; label: string; count: AdminCount }[] =
    [
      { id: "published", label: "Published", count: published },
      { id: "needs_details", label: "Needs details", count: needsDetails },
      { id: "rejected", label: "Rejected", count: rejected },
      { id: "all", label: "All records", count: null },
    ];

  return (
    <section aria-labelledby="tournament-queues-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="tournament-queues-heading"
          className="font-display text-xl font-bold text-foreground"
        >
          Work queues
        </h2>
        {current !== "all" ? (
          <Link
            href={adminTournamentQueueHref(filters, "all")}
            className="text-sm font-semibold text-muted-strong hover:text-brand-red"
          >
            Browse all records
          </Link>
        ) : null}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Pick a queue, then narrow by type or name. Unavailable means the count
        failed — not that the queue is empty.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const selected = current === card.id;
          return (
            <Link
              key={card.id}
              href={adminTournamentQueueHref(filters, card.id)}
              aria-current={selected ? "page" : undefined}
              className={
                selected
                  ? "rounded-2xl border border-brand-red/35 bg-accent-soft p-4"
                  : "rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-red/30"
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {card.title}
              </p>
              <p
                className={`mt-2 font-display text-3xl font-bold tabular-nums ${
                  card.count === null ? "text-muted" : "text-foreground"
                }`}
              >
                {formatAdminCount(card.count)}
              </p>
              <p className="mt-2 text-sm text-muted">{card.description}</p>
              <p className="mt-3 text-sm font-semibold text-brand-red">
                {selected ? "Viewing this queue" : card.action}
              </p>
            </Link>
          );
        })}
      </div>
      <nav aria-label="More tournament lists" className="mt-4 flex flex-wrap gap-2">
        {browse.map((item) => {
          const selected = current === item.id;
          return (
            <Link
              key={item.id}
              href={adminTournamentQueueHref(filters, item.id)}
              aria-current={selected ? "page" : undefined}
              className={
                selected
                  ? "inline-flex items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
                  : "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-surface hover:text-foreground"
              }
            >
              {item.label}
              {item.id !== "all" ? (
                <span className="ml-1.5 tabular-nums text-muted">
                  {formatAdminCount(item.count)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
