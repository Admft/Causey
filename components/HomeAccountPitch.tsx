import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Conversion band. Searching works signed out, so this has to earn the account
 * by naming what each role actually gets. Roles link into a pre-selected
 * signup rather than a generic one, so the first screen already fits them.
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

export function HomeAccountPitch() {
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
                    className="shrink-0 text-xl text-brand-red transition-transform group-hover:translate-x-1"
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
