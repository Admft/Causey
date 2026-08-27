import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountRole } from "@/lib/auth/types";
import { getCurrentProfile } from "@/lib/auth/session";
import { preferredDiscoveryHref } from "@/lib/category-discovery";
import {
  SEARCH_TOURNAMENTS_LABEL,
  workspaceOpenCta,
} from "@/lib/portal-copy";

/**
 * Conversion band for signed-out visitors. Searching works without an account,
 * so this has to earn signup by naming what each role actually gets.
 * Discovery-first: student path leads; coach tools are secondary disclosure.
 * When already signed in, swap to role next-actions — never pitch Sign up.
 */

const SEARCH_PITCH =
  "Find events by zip, including tournaments clubs publish here.";

const SIGNED_IN_NEXT = (
  searchHref: string
): Record<
  AccountRole,
  {
    heading: string;
    blurb: string;
    primary: { href: string; label: string };
    secondary: { href: string; label: string; description: string }[];
  }
> => {
  const studentWorkspace = workspaceOpenCta("student");
  const parentWorkspace = workspaceOpenCta("parent");
  const coachWorkspace = workspaceOpenCta("coach");
  return {
    student: {
      heading: "You are signed in as a student",
      blurb:
        "Save events you are still deciding on, RSVP when you are going, and keep your schedule in one place.",
      primary: studentWorkspace,
      secondary: [
        {
          href: searchHref,
          label: SEARCH_TOURNAMENTS_LABEL,
          description: SEARCH_PITCH,
        },
        {
          href: "/account",
          label: "Account settings",
          description: "Change your profile, alerts, family links, and sign-in.",
        },
      ],
    },
    parent: {
      heading: "You are signed in as a parent",
      blurb:
        "See which student needs an RSVP or organizer registration, then act from your family desk.",
      primary: parentWorkspace,
      secondary: [
        {
          href: searchHref,
          label: SEARCH_TOURNAMENTS_LABEL,
          description: SEARCH_PITCH,
        },
        {
          href: "/account",
          label: "Account settings",
          description: "Change your profile, alerts, family links, and sign-in.",
        },
      ],
    },
    coach: {
      heading: "You are signed in as a coach or organizer",
      blurb:
        "Invite students with a join code, publish club tournaments, and track who is going.",
      primary: coachWorkspace,
      secondary: [
        {
          href: searchHref,
          label: SEARCH_TOURNAMENTS_LABEL,
          description: SEARCH_PITCH,
        },
        {
          href: "/account",
          label: "Account settings",
          description: "Change your profile, alerts, and sign-in.",
        },
      ],
    },
  };
};

function AccountPitchPanel({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 w-full max-w-md md:max-w-none md:self-center">
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        {heading ? (
          <p className="text-sm font-bold text-foreground">{heading}</p>
        ) : null}
        <ul
          className={
            heading
              ? "mt-3 divide-y divide-line border-y border-line"
              : "divide-y divide-line"
          }
        >
          {children}
        </ul>
      </div>
    </div>
  );
}

function AccountPitchRow({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start justify-between gap-4 py-4"
      >
        <div className="min-w-0">
          <p className="text-lead font-bold text-foreground transition-colors group-hover:text-brand-red">
            {label}
          </p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <span
          aria-hidden="true"
          className="nudge-x mt-0.5 shrink-0 text-lg font-bold text-brand-red"
        >
          →
        </span>
      </Link>
    </li>
  );
}

export async function HomeAccountPitch() {
  const profile = await getCurrentProfile();

  if (profile) {
    const searchHref = profile.preferred_competition_category
      ? preferredDiscoveryHref(profile.preferred_competition_category, {
          zip: profile.zip,
        })
      : "/#search";
    const next =
      SIGNED_IN_NEXT(searchHref)[profile.role] ??
      SIGNED_IN_NEXT(searchHref).student;
    return (
      <section
        className="home-band band-join band-join--blue bg-brand-blue-soft/50"
        aria-labelledby="account-heading"
      >
        {/*
          Same composition as the signed-out band below: copy + primary CTA
          left, one filled destination panel right. One grid, one rhythm.
        */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
          <div className="min-w-0 max-w-xl md:self-center">
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2
                id="account-heading"
                className="font-display text-display font-bold tracking-tight text-foreground"
              >
                {next.heading}
              </h2>
              <p className="mt-4 max-w-prose text-base text-muted">{next.blurb}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href={next.primary.href} className="cta-enabled inline-flex">
                  {next.primary.label}
                </Link>
              </div>
            </div>
          </div>

          <AccountPitchPanel>
            {next.secondary.map((action) => (
              <AccountPitchRow key={action.href} {...action} />
            ))}
          </AccountPitchPanel>
        </div>
      </section>
    );
  }

  return (
    <section
      className="home-band band-join band-join--blue bg-brand-blue-soft"
      aria-labelledby="account-heading"
    >
      {/*
        One conversion moment: student CTA owns the left column, the other two
        roles are rows in the same panel on the right (no duplicate student
        card, no orphan disclosure). Solid soft-blue so the band reads as
        "act here," not a washed-out afterthought.
      */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
        <div className="min-w-0 max-w-xl md:self-center">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2
              id="account-heading"
              className="max-w-[20ch] font-display text-display font-bold tracking-tight text-foreground"
            >
              Search without an account today. Sign in when you need a plan.
            </h2>
            <p className="mt-4 max-w-prose text-base text-muted">
              You can browse without signing in. Create an account when you want
              to save events, RSVP to club invites, and keep your plan in one
              place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/signup?role=student" className="cta-enabled inline-flex">
                Create a student account
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-muted-strong hover:text-brand-red"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <AccountPitchPanel heading="Also create an account as">
          <AccountPitchRow
            href="/signup?role=parent"
            label="Parent"
            description="Link your child’s account, answer RSVPs, and finish organizer registration from one desk."
          />
          <AccountPitchRow
            href="/signup?role=coach"
            label="Coach or organizer"
            description="Start a club, invite students with a join code, and publish your own tournaments next to public listings."
          />
        </AccountPitchPanel>
      </div>
    </section>
  );
}
