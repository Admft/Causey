import type { Metadata } from "next";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";

export const metadata: Metadata = {
  title: "Schools and districts",
  description:
    "Review Causey's assisted chess pilot for school provisioning, participation workflows, and aggregate district reporting.",
};

const pilotSteps = [
  {
    title: "Provision and verify",
    description:
      "Causey creates the district, verifies participating schools, and hands each school to its authorized administrator.",
  },
  {
    title: "Invite the right people",
    description:
      "School staff distribute student and staff claim links without shared passwords or district-wide student access.",
  },
  {
    title: "Coordinate tournaments",
    description:
      "Coaches publish scoped events, collect RSVPs, track organizer registration, and record attendance.",
  },
  {
    title: "Review participation",
    description:
      "District administrators see school-level counts and attendance rollups without browsing individual student records.",
  },
];

export default function DistrictsPage() {
  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="animate-rise">
            <CauseyLogo size="hero" />
          </div>
          <h1 className="animate-rise animate-rise-delay-1 mt-5 max-w-[18ch] font-display text-display-xl font-bold tracking-tight text-foreground sm:mt-6">
            A district pilot for scholastic chess participation.
          </h1>
          <p className="animate-rise animate-rise-delay-1 mt-4 max-w-2xl text-md text-muted">
            Causey connects discovery with the school work that follows:
            provisioning, invitations, family action, attendance, and aggregate
            reporting. Today this is an assisted pilot, with live email
            verification and legal review required before student rollout.
          </p>
          <div className="animate-rise animate-rise-delay-2 mt-7 flex flex-wrap items-center gap-4">
            <a
              href="https://causey.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Book a district pilot conversation with Causey in a new tab"
              className="cta-enabled inline-flex"
            >
              Book a district pilot conversation{" "}
              <span aria-hidden="true" className="ml-2 nudge-x">
                ↗
              </span>
            </a>
            <Link
              href="/privacy"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Review student data practices
            </Link>
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--surface bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-14 lg:gap-20">
            <div>
              <h2 className="font-display text-display font-bold tracking-tight text-foreground">
                What the assisted pilot covers
              </h2>
              <p className="mt-3 text-base text-muted">
                Causey and the district complete each setup stage together.
                There is no instant district signup or public price promise.
              </p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {pilotSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid gap-2 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4"
                >
                  <span className="text-sm font-semibold text-brand-red">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--blue bg-brand-blue-soft/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="font-display text-display font-bold tracking-tight text-foreground">
              Built for scoped responsibility
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">
              District administrators manage schools and aggregate reporting.
              School administrators manage staffing and settings. Coaches
              manage tournaments and rosters. Parents and students see the
              actions that belong to them.
            </p>
          </div>
          <div className="md:border-l md:border-line md:pl-12">
            <h2 className="font-display text-display font-bold tracking-tight text-foreground">
              What still needs review
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">
              Before a paid student rollout, Causey and the district must agree
              on commercial terms, support, privacy, retention, security, and
              product-email readiness. Causey does not present the current
              pilot as a completed procurement package.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
