/**
 * Featured tournament mark — top-left of cards.
 * Solid brand-red plate + white medal so it reads on photos and soft fills.
 * One instance per card; standing text carries the words (National / Major open).
 */
export function FeaturedAwardMark({
  className = "h-8 w-8",
  label = "Featured tournament",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-brand-red text-white shadow-[var(--shadow-card)] ${className}`}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="h-[60%] w-[60%]"
      >
        <circle cx="10" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M7 13.2L5.6 17.5l4.4-2L14.4 17.5 13 13.2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
