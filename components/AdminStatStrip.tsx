import type { ReactNode } from "react";
import Link from "next/link";

export type AdminStatItem = {
  label: string;
  value: number | string | null;
  href?: string;
};

export function formatAdminCount(value: number | string | null): string {
  if (value === null) return "Unavailable";
  return String(value);
}

function StatRow({ item }: { item: AdminStatItem }) {
  const display = formatAdminCount(item.value);
  const unavailable = item.value === null;
  const body = (
    <>
      <dt className="text-sm text-muted-strong">{item.label}</dt>
      <dd
        className={`font-display text-lg font-bold tabular-nums ${
          unavailable ? "text-muted" : "text-foreground"
        }`}
      >
        {display}
      </dd>
    </>
  );

  if (!item.href) {
    return (
      <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex items-baseline justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-surface-soft"
    >
      {body}
    </Link>
  );
}

function StatCell({ item }: { item: AdminStatItem }) {
  const display = formatAdminCount(item.value);
  const unavailable = item.value === null;
  const body = (
    <>
      <dt className="text-xs font-semibold text-muted">{item.label}</dt>
      <dd
        className={`mt-1 font-display text-xl font-bold tabular-nums ${
          unavailable ? "text-muted" : "text-foreground"
        }`}
      >
        {display}
      </dd>
    </>
  );

  if (!item.href) {
    return <div className="border-l-2 border-brand-red pl-3">{body}</div>;
  }

  return (
    <Link
      href={item.href}
      className="border-l-2 border-brand-red pl-3 transition-colors hover:border-brand-red-hover"
    >
      {body}
    </Link>
  );
}

export function StatCluster({
  items,
  label,
  denseOnLg = false,
}: {
  items: AdminStatItem[];
  label?: string;
  denseOnLg?: boolean;
}) {
  const wideOnLg = !denseOnLg && items.length >= 5;
  return (
    <section aria-label={label}>
      {label ? (
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      ) : null}
      <dl
        className={`grid grid-cols-2 gap-x-6 gap-y-3 ${
          wideOnLg ? "lg:grid-cols-3" : ""
        } ${label ? "mt-3" : ""}`}
      >
        {items.map((item) => (
          <StatCell key={item.label} item={item} />
        ))}
      </dl>
    </section>
  );
}

export function AdminStatStrip({
  items,
  label,
  chart,
}: {
  items: AdminStatItem[];
  label?: string;
  chart?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-2xl border border-line bg-surface"
    >
      {label ? (
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-foreground">
          {label}
        </h2>
      ) : null}
      <dl className="divide-y divide-line">
        {items.map((item) => (
          <StatRow key={item.label} item={item} />
        ))}
      </dl>
      {chart ? (
        <div className="border-t border-line px-4 py-3">{chart}</div>
      ) : null}
    </section>
  );
}

export function AdminOpsLedger({
  groups,
}: {
  groups: { title: string; items: AdminStatItem[]; chart?: ReactNode }[];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group) => (
        <AdminStatStrip
          key={group.title}
          label={group.title}
          items={group.items}
          chart={group.chart}
        />
      ))}
    </div>
  );
}
