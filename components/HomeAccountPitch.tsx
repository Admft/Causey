import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";
import { getCurrentProfile } from "@/lib/auth/session";

/**
 * Conversion band for signed-out visitors. Searching works without an account,
 * so this has to earn signup by naming what each role actually gets.
 * When already signed in, swap to role next-actions — never pitch Sign up.
 */
const ROLE_ROUTES: {
  role: AccountRole;
  title: string;
  description: string;
  emphasis?: boolean;
}[] = [
  {
    role: "student",
    title: "Student",
    description:
      "Save events you are weighing, RSVP, and keep every upcoming tournament in one schedule.",
  },
  {
    role: "parent",
    title: "Parent",
    description:
      "Link to your child's account, RSVP on their behalf, and follow the events they enter.",
  },
  {
    role: "coach",
    title: "Coach or organizer",
    description:
      "Start a club, invite students with a join code, and publish your own tournaments.",
    emphasis: true,
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
      { href: "/me", label: "Open my schedule", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/orgs", label: "My clubs" },
    ],
  },
  parent: {
    heading: "You are signed in as a parent",
    blurb:
      "Link your children, RSVP for them, and follow the events they enter from one place.",
    actions: [
      { href: "/family", label: "Open family", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/me", label: "My account" },
    ],
  },
  coach: {
    heading: "You are signed in as a coach or organizer",
    blurb:
      "Invite students with a join code, publish club tournaments, and track who is going.",
    actions: [
      { href: "/orgs", label: "Open my clubs", primary: true },
      { href: "/chess", label: "Search tournaments" },
      { href: "/orgs/new", label: "Start a club" },
    ],
  },
};

export async function HomeAccountPitch() {
  const profile = await getCurrentProfile();

  if (profile) {
    const next = SIGNED_IN_NEXT[profile.role] ?? SIGNED_IN_NEXT.student;
    return (
      <section
        className="section-rule bg-brand-blue-soft/50"
        aria-labelledby="account-heading"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-2xl">
            <h2
              id="account-heading"
              className="max-w-[24ch] font-display text-display font-bold tracking-tight text-foreground"
            >
              {next.heading}
            </h2>
            <p className="mt-4 max-w-prose text-base text-muted">{next.blurb}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {next.actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.primary
                    ? "cta-enabled inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                    : "inline-flex items-center justify-center rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:border-foreground/30"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section-rule bg-brand-blue-soft/50"
      aria-labelledby="account-heading"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
        <div>
          <h2
            id="account-heading"
            className="max-w-[20ch] font-display text-display font-bold tracking-tight text-foreground"
          >
            Searching is free. An account is where it gets useful.
          </h2>
          <p className="mt-4 max-w-prose text-base text-muted">
            Browsing tournaments never requires signing in. An account is for
            what comes after you find one: saving the events you are still
            deciding between, telling your coach and family you are going, and
            seeing everything you have entered on a single schedule.
          </p>
          <p className="mt-4 max-w-prose text-base text-muted">
            If you run a club or a school program, you can list your own
            tournaments next to the national feeds Causey already indexes, and
            bring your students in with a join code instead of a sign-up sheet.
          </p>
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-red hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-strong">
            Get started as a…
          </h3>
          <ul className="mt-4 space-y-3">
            {ROLE_ROUTES.map((option) => (
              <li key={option.role}>
                <Link
                  href={`/signup?role=${option.role}`}
                  className={`card-lift group flex items-start justify-between gap-4 rounded-2xl border bg-surface p-5 ${
                    option.emphasis ? "border-brand-red/30" : "border-line"
                  }`}
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
        </div>
      </div>
    </section>
  );
}
