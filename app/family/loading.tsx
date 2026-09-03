/**
 * Route skeleton for the family workspace. Mirrors the status panel + grouped
 * child sections so parents see the page's shape while household data loads.
 */
export default function FamilyLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8" role="status">
      <div aria-hidden="true">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton mt-2 h-9 w-56 max-w-full" />
        <div className="skeleton mt-3 h-4 w-80 max-w-full" />

        {/* Matches the "needs your response / caught up" status panel. */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="skeleton h-6 w-64 max-w-full" />
          <div className="skeleton mt-3 h-4 w-full max-w-prose" />
          <div className="skeleton mt-5 h-11 w-36" />
        </section>

        {/* Matches a child section: name, membership line, group label, event rows. */}
        <section className="section-rule mt-10 pt-8">
          <div className="skeleton h-7 w-44" />
          <div className="skeleton mt-2 h-4 w-64 max-w-full" />
          <div className="mt-4 flex flex-col gap-6">
            <div>
              <div className="skeleton h-4 w-48" />
              <div className="mt-3 flex flex-col gap-3">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
              </div>
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading your family workspace…</span>
    </div>
  );
}
