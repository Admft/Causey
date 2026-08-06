/**
 * Route skeleton for the organizations workspace (list, detail, roster).
 * Mirrors the page's header + row-list structure so the swap to real data
 * reads as content arriving, not a jump cut.
 */
export default function OrgsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8" role="status">
      <div aria-hidden="true">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-2 h-9 w-64 max-w-full" />
        <div className="skeleton mt-3 h-4 w-80 max-w-full" />

        <section className="section-rule mt-10 pt-8">
          <div className="skeleton h-4 w-56 max-w-full" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="skeleton h-[4.25rem]" />
            <div className="skeleton h-[4.25rem]" />
            <div className="skeleton h-[4.25rem]" />
          </div>
        </section>

        <section className="section-rule mt-10 pt-8">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-4 h-11 w-full max-w-sm" />
        </section>
      </div>
      <span className="sr-only">Loading your organizations…</span>
    </div>
  );
}
