import Link from "next/link";

export function HomeDistrictPitch() {
  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="district-pitch-heading"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-12 lg:gap-16">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold text-brand-red">
            Schools and districts
          </p>
          <h2
            id="district-pitch-heading"
            className="mt-2 max-w-[18ch] font-display text-display font-bold tracking-tight text-foreground"
          >
            Coordinate the chess opportunities your students already need.
          </h2>
          <p className="mt-4 max-w-prose text-base text-muted">
            Causey is testing an assisted district pilot for school setup,
            staff handoff, student invitations, tournament attendance, and
            aggregate reporting. It is not a self-serve district purchase yet.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/districts" className="cta-enabled inline-flex">
              Review the district pilot
            </Link>
            <a
              href="https://causey.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Talk with the Causey founding team on causey.dev in a new tab"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Talk with the founding team{" "}
              <span aria-hidden="true" className="nudge-x">
                ↗
              </span>
            </a>
          </div>
        </div>

        <div className="min-w-0 border-y border-line py-1">
          <dl className="divide-y divide-line">
            <div className="py-4">
              <dt className="font-semibold text-foreground">Provision schools</dt>
              <dd className="mt-1 text-sm text-muted">
                District-owned setup with verified school-admin handoff.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-semibold text-foreground">
                Keep student access scoped
              </dt>
              <dd className="mt-1 text-sm text-muted">
                School rosters stay with authorized school staff.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-semibold text-foreground">
                See aggregate participation
              </dt>
              <dd className="mt-1 text-sm text-muted">
                District reporting without a district-wide student directory.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
