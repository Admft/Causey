"use client";

import Link from "next/link";
import type { HomeMyTournamentsSummary } from "@/lib/home-my-tournaments";
import {
  HOME_MY_TOURNAMENTS_LOGIN_HREF,
  HOME_MY_TOURNAMENTS_SIGNUP_HREF,
} from "@/lib/home-my-tournaments";

/**
 * Signed-out: sign in (return to this tab). Signed-in: upcoming Going /
 * RSVP / traveling / hosted rows, or an honest empty state. Never invents
 * listings or calls club RSVP “registration.”
 */
export function HomeHeroMyTournaments({
  summary,
  onSearchInstead,
}: {
  summary: HomeMyTournamentsSummary | null;
  onSearchInstead: () => void;
}) {
  if (!summary) {
    return (
      <div>
        <p className="text-sm text-muted">
          Sign in to see events you marked Going, plus tournaments your club,
          team, school, or district is hosting or traveling to.
        </p>
        <div className="mt-4">
          <Link
            href={HOME_MY_TOURNAMENTS_LOGIN_HREF}
            className="cta-enabled inline-flex w-full justify-center"
          >
            Sign in
          </Link>
          <p className="mt-3 text-2xs text-muted">
            <Link
              href={HOME_MY_TOURNAMENTS_SIGNUP_HREF}
              className="font-semibold text-brand-red hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (summary.items.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-foreground">
          {summary.emptyTitle}
        </p>
        <p className="mt-1 text-sm text-muted">{summary.emptyDescription}</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={onSearchInstead}
            className="cta-enabled w-full touch-manipulation"
          >
            Search tournaments
          </button>
          <p className="mt-3 text-2xs text-muted">
            <Link
              href={summary.seeAll.href}
              className="font-semibold text-brand-red hover:underline"
            >
              {summary.seeAll.label}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {summary.items.map((item) => (
          <li key={item.competitionId} className="py-3">
            <Link
              href={`/event/${item.slug}`}
              className="text-sm font-semibold text-foreground transition-colors hover:text-brand-red"
            >
              {item.name}
            </Link>
            <p className="mt-0.5 text-2xs text-muted">{item.meta}</p>
            <p className="mt-0.5 text-2xs font-semibold text-muted-strong">
              {item.reason}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-2xs text-muted">
        <Link
          href={summary.seeAll.href}
          className="font-semibold text-brand-red hover:underline"
        >
          {summary.seeAll.label}
        </Link>
      </p>
    </div>
  );
}
