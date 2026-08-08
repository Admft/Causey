import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared “one next job” callout for role portals.
 * Compact left-rule strip — not a full-width soft card that sits mostly empty.
 *
 * On phones the primary CTA pins to the bottom so it stays reachable while
 * scrolling long inboxes; the in-panel buttons remain from sm+.
 */
export function PortalMission({
  title,
  description,
  action,
  secondary,
  children,
  pinActionOnMobile = true,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
  /** Keep the mission CTA reachable on phones while lists scroll. */
  pinActionOnMobile?: boolean;
}) {
  const pinMobile = Boolean(pinActionOnMobile && action);

  return (
    <>
      <section className="max-w-xl border-l-2 border-brand-red pl-4 sm:pl-5">
        <h2 className="font-display text-xl font-bold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {children}
        {action || secondary ? (
          <div
            className={`mt-4 flex flex-wrap items-center gap-4 ${
              pinMobile ? "hidden sm:flex" : ""
            }`}
          >
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

      {pinMobile && action ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden"
            aria-hidden={false}
          >
            <div className="pointer-events-auto border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-white/90">
              <div className="mx-auto flex max-w-3xl items-center gap-3">
                <Link
                  href={action.href}
                  className="cta-enabled inline-flex min-h-11 flex-1 items-center justify-center text-center"
                >
                  {action.label}
                </Link>
                {secondary ? (
                  <Link
                    href={secondary.href}
                    className="shrink-0 whitespace-nowrap text-sm font-semibold text-muted-strong hover:text-brand-red"
                  >
                    {secondary.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          {/* Keep the last list rows clear of the pinned CTA. */}
          <div className="h-20 sm:hidden" aria-hidden />
        </>
      ) : null}
    </>
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
      {trailing ? <div className="shrink-0 sm:ml-4">{trailing}</div> : null}
    </>
  );

  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {body}
    </li>
  );
}
