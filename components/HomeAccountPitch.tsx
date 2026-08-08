import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";
import { getCurrentProfile } from "@/lib/auth/session";

/**
 * Conversion band for signed-out visitors. Searching works without an account,
 * so this has to earn signup by naming what each role actually gets.
 * Discovery-first: student path leads; coach tools are secondary disclosure.
 * When already signed in, swap to role next-actions — never pitch Sign up.
 */
const ROLE_ROUTES: {
  role: AccountRole;
  title: string;
  description: string;
}[] = [
  {
    role: "student",
    title: "Student",
    description:
      "Save events you are weighing, RSVP when invited, and keep upcoming tournaments in one plan.",
  },
  {
    role: "parent",
    title: "Parent",
    description:
      "Link your child’s account, answer RSVPs, and finish organizer registration from one desk.",
  },
];

const SIGNED_IN_NEXT: Record<
  AccountRole,
  { heading: string; blurb: string; actions: { href: string; label: string; primary?: boolean }[] }
> = {
  student: {
    heading: "You are signed in as a student",
    blurb:
      "Save events you are still deciding on, RSVP when you are going, and keep your schedule in one place.",
    actions: [
      { href: "/me", label: "Open my tournaments", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/account", label: "Account settings" },
    ],
  },
  parent: {
    heading: "You are signed in as a parent",
    blurb:
      "See which student needs an RSVP or organizer registration, then act from your family desk.",
    actions: [
      { href: "/family", label: "Open family desk", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/account", label: "Account settings" },
    ],
  },
  coach: {
    heading: "You are signed in as a coach or organizer",
    blurb:
      "Invite students with a join code, publish club tournaments, and track who is going.",
    actions: [
      { href: "/orgs", label: "Open my organizations", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/account", label: "Account settings" },
    ],
  },
};

export async function HomeAccountPitch() {
  const profile = await getCurrentProfile();

  if (profile) {
    const next = SIGNED_IN_NEXT[profile.role] ?? SIGNED_IN_NEXT.student;
    const primary = next.actions.find((action) => action.primary);
    const secondary = next.actions.filter((action) => !action.primary);
    return (
      <section
        className="home-band band-join band-join--blue bg-brand-blue-soft/50"
        aria-labelledby="account-heading"
      >
        {/*
          md+ two-col fills the band. Secondary actions stay compact text links
          (not full-bleed justify-between cards — short labels look stretched).
        */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-14">
          <div className="min-w-0 max-w-xl">
            <h2
              id="account-heading"
              className="font-display text-display font-bold tracking-tight text-foreground"
            >
              {next.heading}
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">{next.blurb}</p>
          </div>

          <nav
            aria-label="Signed-in next steps"
            className="min-w-0 w-full max-w-xs md:max-w-none"
          >
            <p className="text-sm font-semibold text-foreground">Next</p>
            <div className="mt-3 flex flex-col gap-3">
              {primary ? (
                <Link
                  href={primary.href}
                  className="cta-enabled inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  {primary.label}
                </Link>
              ) : null}
              <ul className="flex flex-col gap-2 border-t border-brand-blue/35 pt-3">
                {secondary.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-muted-strong hover:text-brand-red"
                    >
                      {action.label}
                      <span
                        aria-hidden="true"
                        className="nudge-x text-brand-red"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </section>
    );
  }

  return (
    <section
      className="home-band band-join band-join--blue bg-brand-blue-soft/50"
      aria-labelledby="account-heading"
    >
      {/*
        Two-col from md so iPad doesn't leave a dead right column + stretched
        role cards. Cards stay capped (design-system tablet rule).
      */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
        <div className="min-w-0 max-w-xl">
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

        <div className="min-w-0 w-full max-w-md md:max-w-none">
          <h3 className="text-sm font-semibold text-foreground">Or start as</h3>
          <ul className="mt-4 space-y-3">
            {ROLE_ROUTES.map((option) => (
              <li key={option.role}>
                <Link
                  href={`/signup?role=${option.role}`}
                  className="card-lift group flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {option.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {option.description}
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
          <details className="mt-5 rounded-xl border border-brand-blue/45 bg-surface/80 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted-strong">
              Coach or organizer?
            </summary>
            <p className="mt-2 text-sm text-muted">
              Start a club, invite students with a join code, and publish your
              own tournaments next to the feeds Causey indexes.
            </p>
            <Link
              href="/signup?role=coach"
              className="mt-3 inline-flex text-sm font-semibold text-brand-red hover:underline"
            >
              Create a coach account
            </Link>
          </details>
        </div>
      </div>
    </section>
  );
}
