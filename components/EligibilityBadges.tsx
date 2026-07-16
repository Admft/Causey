import type { Section } from "@/lib/schemas";
import { gradeLabel } from "@/lib/format";

/**
 * Per-section eligibility, rendered as functional badges (design system §9:
 * project radius, no rounded-full, every badge encodes a real constraint).
 * Neutral outline = who the section is for (grade / rating / age bands).
 * Soft red = a restriction that can exclude you (girls-only, residency).
 */

function rangeBadge(section: Section): string | null {
  const { min_rating, max_rating } = section;
  if (min_rating === null && max_rating === null) return null;
  if (min_rating !== null && max_rating !== null) return `Rated ${min_rating}–${max_rating}`;
  if (max_rating !== null) return `Under ${max_rating + 1}`;
  return `Rated ${min_rating}+`;
}

function gradeBadge(section: Section): string | null {
  const { min_grade, max_grade } = section;
  if (min_grade === null && max_grade === null) return null;
  const lo = gradeLabel(min_grade ?? 0);
  const hi = gradeLabel(max_grade ?? 12);
  return lo === hi ? `Grade ${lo}` : `Grades ${lo}–${hi}`;
}

function ageBadge(section: Section): string | null {
  const { min_age, max_age } = section;
  if (min_age === null && max_age === null) return null;
  if (min_age !== null && max_age !== null) return `Ages ${min_age}–${max_age}`;
  if (max_age !== null) return `Under ${max_age + 1}`;
  return `Ages ${min_age}+`;
}

const NEUTRAL =
  "inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-muted-strong";
const RESTRICTED =
  "inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-brand-red";

export function EligibilityBadges({ section }: { section: Section }) {
  const neutral = [gradeBadge(section), rangeBadge(section), ageBadge(section)].filter(
    (b): b is string => b !== null
  );
  const restricted: string[] = [];
  if (section.gender_restriction === "girls") restricted.push("Girls only");
  if (section.residency_state) restricted.push(`${section.residency_state} residents only`);

  if (neutral.length === 0 && restricted.length === 0) {
    return <span className={NEUTRAL}>Open to all</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {neutral.map((b) => (
        <span key={b} className={NEUTRAL}>
          {b}
        </span>
      ))}
      {restricted.map((b) => (
        <span key={b} className={RESTRICTED}>
          {b}
        </span>
      ))}
    </span>
  );
}
