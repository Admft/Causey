import Link from "next/link";
import type { AdminCount } from "@/lib/data/admin";

export type AdminStatItem = {
  label: string;
  value: AdminCount | string;
  href?: string;
};

export function formatAdminCount(value: AdminCount | string): string {
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
      <div className="flex items-baseline justify-between gap-4 px-4 py-3">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex items-baseline justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-soft"
    >
      {body}
    </Link>
  );
}

export function AdminStatStrip({
  items,
  label,
}: {
  items: AdminStatItem[];
  label?: string;
}) {
  return (
    <section aria-label={label}>
      {label ? (
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      ) : null}
      <dl
        className={`divide-y divide-line border-y border-line bg-surface ${
          label ? "mt-3" : ""
        }`}
      >
        {items.map((item) => (
          <StatRow key={item.label} item={item} />
        ))}
      </dl>
    </section>
  );
}

export function AdminOpsLedger({
  groups,
}: {
  groups: { title: string; items: AdminStatItem[] }[];
}) {
  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <AdminStatStrip
          key={group.title}
          label={group.title}
          items={group.items}
        />
      ))}
    </div>
  );
}
