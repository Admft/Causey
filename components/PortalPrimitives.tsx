import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared mission callout for role portals. Each landing still owns its own
 * page chrome — this only standardizes the “one next job” panel.
 */
export function PortalMission({
  title,
  description,
  action,
  secondary,
  children,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-accent/25 bg-accent-soft/40 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">{description}</p>
      {children}
      {action || secondary ? (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {action ? (
            <Link href={action.href} className="cta-enabled inline-flex">
              {action.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link
              href={secondary.href}
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Quiet hairline row for secondary lists under a mission. */
export function PortalListRow({
  href,
  title,
  meta,
  trailing,
}: {
  href?: string;
  title: string;
  meta?: string;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <div className="min-w-0">
        {href ? (
          <Link
            href={href}
            className="font-semibold text-foreground hover:text-brand-red"
          >
            {title}
          </Link>
        ) : (
          <span className="font-semibold text-foreground">{title}</span>
        )}
        {meta ? (
          <span className="mt-1 block text-xs text-muted">{meta}</span>
        ) : null}
      </div>
      {trailing}
    </>
  );

  return (
    <li className="flex flex-col gap-3 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      {body}
    </li>
  );
}
