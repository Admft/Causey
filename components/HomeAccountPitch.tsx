import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";
import { getCurrentProfile } from "@/lib/auth/session";
import { RoleRouteCards } from "@/components/RoleRouteCards";

/**
 * Conversion band for signed-out visitors. Searching works without an account,
 * so this has to earn signup by naming what each role actually gets.
 * Discovery-first: student path leads; coach tools are secondary disclosure.
 * When already signed in, swap to role next-actions — never pitch Sign up.
 */

const SIGNED_IN_NEXT: Record<
  AccountRole,
  {
    heading: string;
    blurb: string;
    primary: { href: string; label: string };
    secondary: { href: string; label: string; description: string }[];
  }
> = {
  student: {
    heading: "You are signed in as a student",
    blurb:
      "Save events you are still deciding on, RSVP when you are going, and keep your schedule in one place.",
    primary: { href: "/me", label: "Open my tournaments" },
    secondary: [
      {
        href: "/chess",
        label: "Search tournaments",
        description:
          "Indexed feeds and club-published events in one search.",
      },
      {
        href: "/account",
        label: "Account settings",
        description: "Profile, alerts, family, and sign-in.",
      },
    ],
  },
  parent: {
    heading: "You are signed in as a parent",
    blurb:
      "See which student needs an RSVP or organizer registration, then act from your family desk.",
    primary: { href: "/family", label: "Open family desk" },
    secondary: [
      {
        href: "/chess",
        label: "Search tournaments",
        description:
          "Indexed feeds and club-published events in one search.",
      },
      {
        href: "/account",
        label: "Account settings",
        description: "Profile, alerts, family, and sign-in.",
      },
    ],
  },
  coach: {
    heading: "You are signed in as a coach or organizer",
    blurb:
      "Invite students with a join code, publish club tournaments, and track who is going.",
    primary: { href: "/orgs", label: "Open my organizations" },
    secondary: [
      {
        href: "/chess",
        label: "Search tournaments",
        description:
          "Indexed feeds and club-published events in one search.",
      },
      {
        href: "/account",
        label: "Account settings",
        description: "Profile, alerts, and sign-in.",
      },
    ],
  },
};

export async function HomeAccountPitch() {
  const profile = await getCurrentProfile();

  if (profile) {
    const next = SIGNED_IN_NEXT[profile.role] ?? SIGNED_IN_NEXT.student;
    return (
      <section
        className="home-band band-join band-join--blue bg-brand-blue-soft/50"
        aria-labelledby="account-heading"
      >
        {/*
          Same composition as the signed-out band below: copy + primary CTA
          left, descriptive cards right. One grid, one rhythm, no dead space.
        */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
          <div className="min-w-0 max-w-xl">
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

          <ul className="min-w-0 w-full max-w-md space-y-3 md:max-w-none">
            {next.secondary.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="card-lift group flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {action.label}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {action.description}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="nudge-x shrink-0 text-xl text-brand-red"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
        roles are cards on the right (no duplicate student card, no orphan
        disclosure). Solid soft-blue so the band reads as "act here," not a
        washed-out afterthought.
      */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
        <div className="min-w-0 max-w-xl md:self-center">
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

        <div className="min-w-0 w-full max-w-md md:max-w-none md:self-center">
          <h3 className="text-sm font-semibold text-foreground">
            Or start as
          </h3>
          <RoleRouteCards exclude={["student"]} includeCoach />
        </div>
      </div>
    </section>
  );
}
