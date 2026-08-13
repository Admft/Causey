export default function EventLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8"
      role="status"
      aria-label="Loading event"
    >
      <div aria-hidden="true">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton mt-3 h-10 w-full max-w-2xl" />
        <div className="skeleton mt-4 h-5 w-80 max-w-full" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="skeleton h-80" />
          <div className="skeleton h-56" />
        </div>
      </div>
      <span className="sr-only">Loading event details…</span>
    </main>
  );
}
