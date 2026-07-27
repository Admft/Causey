/**
 * Featured tournament mark — single outline icon, no pastel chip, no emoji.
 * Place once (top-left of a card). Pair with standing text elsewhere; do not
 * also print the word "Featured" next to it (anti-vibecode: no restating).
 */
export function FeaturedAwardMark({
  className = "h-5 w-5",
  label = "Featured tournament",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={`inline-flex text-brand-red ${className}`} role="img" aria-label={label}>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-full w-full">
        <circle cx="10" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 13.5L5.5 18l4.5-2.2L14.5 18 13 13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
