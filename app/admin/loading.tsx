export default function AdminLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8"
      role="status"
      aria-label="Loading administration workspace"
    >
      <div aria-hidden="true">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-3 h-10 w-72 max-w-full" />
        <div className="skeleton mt-8 h-12 w-full" />
        <div className="mt-5 grid gap-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      </div>
      <span className="sr-only">Loading administration workspace…</span>
    </div>
  );
}
