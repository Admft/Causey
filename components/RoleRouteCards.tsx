import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Signed-out account routing: which account type do you create? Shared by the
 * home conversion band and the sign-in page so the role pitch never drifts.
 * Coach/organizer stays secondary disclosure in each host surface.
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

export function RoleRouteCards() {
  return (
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
              <p className="mt-1 text-sm text-muted">{option.description}</p>
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
  );
}
