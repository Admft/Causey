/**
 * Causey logo lockup: red rounded square with a white "C" plus the serif
 * wordmark. Mark geometry per CAUSEY-DESIGN-SYSTEM.txt §8.1 — rx ≈ 7 on a
 * 32×32 viewBox, mark scales with the wordmark's em size, and the mark and
 * wordmark always travel together on branded surfaces.
 */
export function CauseyLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSize = { sm: "text-lead", md: "text-xl", lg: "text-2xl" }[size];
  return (
    <span className={`inline-flex items-center gap-2 ${textSize}`}>
      <svg
        viewBox="0 0 32 32"
        className="h-[1.05em] w-[1.05em]"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="32" height="32" rx="7" fill="#c23b32" />
        <path
          d="M21.5 11.2a7 7 0 1 0 0 9.6"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="font-display font-semibold tracking-[-0.03em] text-foreground">
        Causey
      </span>
    </span>
  );
}
