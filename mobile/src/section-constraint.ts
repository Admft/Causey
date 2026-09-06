export type EventSection = {
  id: string;
  name: string;
  min_rating: number | null;
  max_rating: number | null;
  min_grade: number | null;
  max_grade: number | null;
  min_age: number | null;
  max_age: number | null;
  gender_restriction: "girls" | null;
  residency_state: string | null;
  entry_fee_cents: number | null;
};

function gradeLabel(grade: number): string {
  return grade === 0 ? "K" : String(grade);
}

export function sectionConstraint(section: EventSection): string {
  const bits: string[] = [];
  const { min_rating, max_rating, min_grade, max_grade, min_age, max_age } =
    section;
  if (min_rating !== null && max_rating !== null) {
    bits.push(`Rated ${min_rating}–${max_rating}`);
  } else if (max_rating !== null) {
    bits.push(`Under ${max_rating + 1}`);
  } else if (min_rating !== null) {
    bits.push(`Rated ${min_rating}+`);
  }
  if (min_grade !== null || max_grade !== null) {
    const lo = gradeLabel(min_grade ?? 0);
    const hi = gradeLabel(max_grade ?? 12);
    bits.push(lo === hi ? `Grade ${lo}` : `Grades ${lo}–${hi}`);
  }
  if (min_age !== null && max_age !== null) {
    bits.push(`Ages ${min_age}–${max_age}`);
  } else if (max_age !== null) {
    bits.push(`Under ${max_age + 1}`);
  } else if (min_age !== null) {
    bits.push(`Ages ${min_age}+`);
  }
  if (section.gender_restriction === "girls") bits.push("Girls only");
  if (section.residency_state) {
    bits.push(`${section.residency_state} residents only`);
  }
  return bits.length ? bits.join(" · ") : "Open to all";
}
