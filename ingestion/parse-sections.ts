/**
 * Extract section rating bands, grades, and entry fees from free-text TLA/CCA
 * copy. Conservative: only emit a section when the pattern is clear; otherwise
 * callers may fall back to a single Open section so rating filters still work.
 *
 * Rating convention matches EligibilityBadges: U1000 → max_rating 999
 * (displayed as "Under 1000").
 */
import { randomUUID } from "node:crypto";
import type { Section } from "../lib/schemas";

export type ParsedSectionDraft = {
  name: string;
  min_rating: number | null;
  max_rating: number | null;
  min_grade: number | null;
  max_grade: number | null;
  entry_fee_cents: number | null;
};

export type ParsedEventExtras = {
  sections: ParsedSectionDraft[];
  /** null = unknown / not listed; 0 = explicitly free. */
  entry_fee_cents: number | null;
  rated: boolean;
  fideRated: boolean;
};

const GRADE_WORD: Record<string, number> = {
  k: 0,
  kindergarten: 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "11": 11,
  "12": 12,
};

function cleanText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function underCap(n: number): number {
  return Math.max(0, n - 1);
}

function pushUnique(
  out: ParsedSectionDraft[],
  draft: ParsedSectionDraft
): void {
  const key = draft.name.toLowerCase();
  if (out.some((s) => s.name.toLowerCase() === key)) return;
  out.push(draft);
}

function openSection(name = "Open"): ParsedSectionDraft {
  return {
    name,
    min_rating: null,
    max_rating: null,
    min_grade: null,
    max_grade: null,
    entry_fee_cents: null,
  };
}

export { openSection };

function parseGradeToken(raw: string): number | null {
  const t = raw.toLowerCase().replace(/\./g, "");
  if (t in GRADE_WORD) return GRADE_WORD[t]!;
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    if (n >= 0 && n <= 12) return n;
  }
  return null;
}

/** Pull named under/open/championship sections from organizer copy. */
export function parseSectionsFromText(text: string): ParsedSectionDraft[] {
  const t = cleanText(text);
  const out: ParsedSectionDraft[] = [];

  // "Under 2100 Section" / "Under 1800:" / "U2100"
  const underRe =
    /\b(?:Under|U)\s*[-–]?\s*(\d{3,4})\s*(?:\/\s*Unrated)?\s*(?:Section)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = underRe.exec(t))) {
    const cap = Number(m[1]);
    if (cap < 100 || cap > 3000) continue;
    pushUnique(out, {
      name: `U${cap}`,
      min_rating: null,
      max_rating: underCap(cap),
      min_grade: null,
      max_grade: null,
      entry_fee_cents: null,
    });
  }

  // Championship / Major / Reserve / Open — only when labeled as sections.
  if (/\bMajor\s+Section\b/i.test(t)) {
    pushUnique(out, openSection("Major"));
  }
  if (
    /\bChampionship\s+Section\b/i.test(t) ||
    (/\bChampionship\b/i.test(t) && /\bsections?\b/i.test(t)) ||
    /\bChampionship\s*:\s*(?:FIDE|US\s*Chess|rated)/i.test(t)
  ) {
    if (!out.some((s) => /^championship$/i.test(s.name))) {
      pushUnique(out, openSection("Championship"));
    }
  }
  if (
    /\bReserve\s+Section\b/i.test(t) ||
    /\bReserve\s*:\s*(?:US\s*Chess|FIDE|rated|Open to)/i.test(t) ||
    (/\bReserve\b/i.test(t) && /\bsections?\b/i.test(t) && /\bunder\s+\d{3,4}\b/i.test(t))
  ) {
    const reserveUnder = t.match(
      /Reserve[^.]{0,120}?(?:under|U)\s*[-–]?\s*(\d{3,4})/i
    );
    const cap = reserveUnder ? Number(reserveUnder[1]) : null;
    pushUnique(out, {
      name: "Reserve",
      min_rating: null,
      max_rating: cap && cap >= 100 && cap <= 3000 ? underCap(cap) : null,
      min_grade: null,
      max_grade: null,
      entry_fee_cents: null,
    });
  }
  if (/\bOpen\s+Section\b/i.test(t) || /\bsections?[^.|]{0,40}\bOpen\b/i.test(t)) {
    pushUnique(out, openSection("Open"));
  }

  // Grade bands: require Grades/K so "rounds 1-2" never becomes Grades 1–2.
  const gradeRangeLabeled =
    /\bGrades?\s+(K|Kindergarten|\d{1,2})\s*[-–]\s*(\d{1,2}|12)\b/gi;
  while ((m = gradeRangeLabeled.exec(t))) {
    const lo = parseGradeToken(m[1]);
    const hi = parseGradeToken(m[2]);
    if (lo === null || hi === null || lo > hi) continue;
    const name = lo === 0 ? `K-${hi}` : `Grades ${lo}-${hi}`;
    pushUnique(out, {
      name,
      min_rating: null,
      max_rating: null,
      min_grade: lo,
      max_grade: hi,
      entry_fee_cents: null,
    });
  }

  const gradeRangeK = /\b(K|Kindergarten)\s*[-–]\s*(\d{1,2}|12)\b/gi;
  while ((m = gradeRangeK.exec(t))) {
    const lo = parseGradeToken(m[1]);
    const hi = parseGradeToken(m[2]);
    if (lo === null || hi === null || lo > hi) continue;
    pushUnique(out, {
      name: `K-${hi}`,
      min_rating: null,
      max_rating: null,
      min_grade: lo,
      max_grade: hi,
      entry_fee_cents: null,
    });
  }

  // Single scholastic cue without explicit sections: K-12 open
  if (out.length === 0 && /\b(?:scholastic|K-12|K–12)\b/i.test(t)) {
    pushUnique(out, {
      name: "Scholastic",
      min_rating: null,
      max_rating: null,
      min_grade: 0,
      max_grade: 12,
      entry_fee_cents: null,
    });
  }

  // When Championship + Reserve are the real sections, prize-table U-bands
  // (Top U2200, etc.) are noise — keep the named sections only.
  const hasChampionship = out.some((s) => /^championship$/i.test(s.name));
  const hasReserve = out.some((s) => /^reserve$/i.test(s.name));
  if (hasChampionship && hasReserve) {
    return out.filter((s) => !/^U\d+/i.test(s.name));
  }

  return out;
}

/** Adult / open events that are not scholastic. */
export function isAdultOrientedEvent(text: string): boolean {
  return (
    /\b(?:adults?\s+only|adult\s+tournament|18\+|ages?\s*18\s*\+|open\s+to\s+(?:all\s+)?adults)\b/i.test(
      text
    ) ||
    /\b(?:senior\s+(?:open|swiss|championship)|masters?\s+(?:open|section))\b/i.test(
      text
    )
  );
}

export function isScholasticOrientedEvent(text: string): boolean {
  return /\b(?:scholastic|elementary|middle\s+school|high\s+school|K-12|K–12|grades?\s+\d|junior\s+high|primary\s+school)\b/i.test(
    text
  );
}

function isElementaryGradeSection(s: ParsedSectionDraft): boolean {
  if (s.min_rating != null || s.max_rating != null) return false;
  if (s.min_grade === null && s.max_grade === null) return false;
  const hi = s.max_grade ?? 12;
  return hi <= 8;
}

/**
 * Drop contradictory elementary grade sections on adult events
 * (e.g. "rounds 1-3" formerly misread as Grades 1–3 / K–3).
 */
export function reconcileSectionsWithEvent(
  eventName: string,
  bodyText: string,
  sections: ParsedSectionDraft[]
): { sections: ParsedSectionDraft[]; droppedElementary: boolean } {
  const blob = `${eventName}\n${bodyText}`;
  const adult = isAdultOrientedEvent(blob);
  const scholastic = isScholasticOrientedEvent(blob);

  if (!adult || scholastic) {
    return { sections, droppedElementary: false };
  }

  const kept = sections.filter((s) => !isElementaryGradeSection(s));
  const droppedElementary = kept.length !== sections.length;
  if (kept.length === 0 && sections.length > 0) {
    return { sections: [openSection("Open")], droppedElementary: true };
  }
  return { sections: kept, droppedElementary };
}

/** Best-effort entry fee in cents. null = not found; 0 = explicitly free. */
export function parseEntryFeeCents(text: string): number | null {
  const t = cleanText(text);

  const amounts: number[] = [];
  const patterns = [
    /(?:entry\s+fee|EF)\s*[:=]?\s*\$?\s*(\d{1,3})(?:\.\d{2})?/gi,
    /\$\s*(\d{1,3})(?:\.\d{2})?\s*(?:entry|EF|online|at\s+site)/gi,
    /Top\s+\d+\s+sections?\s+entry\s+fee[:\s]*\$?\s*(\d{1,3})/gi,
    /\$\s*(\d{1,3})\s+online\b/gi,
    /\$\s*(\d{1,3})(?:\.\d{2})?\s+through\b/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + 16);
      // "entry fee: $40 less" is a discount, not the base fee.
      if (/^\s*less\b/i.test(after)) continue;
      const dollars = Number(m[1]);
      if (dollars >= 1 && dollars <= 500) amounts.push(dollars * 100);
    }
  }
  if (amounts.length > 0) {
    // Prefer the highest listed base fee when early-bird + door prices appear;
    // " $40 less" discounts are already filtered out.
    const unique = [...new Set(amounts)].sort((a, b) => a - b);
    // Early-bird is usually the lowest primary; door price higher.
    return unique[0]!;
  }

  if (
    /\bcompletely\s+free\b/i.test(t) ||
    /\bthis\s+is\s+a\s+free\b/i.test(t) ||
    /\bno\s+entry\s+fee\b/i.test(t) ||
    /\bentry\s+fee[:\s]*\$?\s*0\b/i.test(t) ||
    /\bEF[:\s]*\$?\s*0\b/i.test(t) ||
    (/\bfree\b/i.test(t) && !/\$\s*\d+/.test(t))
  ) {
    return 0;
  }

  return null;
}

export function parseRatedFlags(text: string): { rated: boolean; fideRated: boolean } {
  const t = cleanText(text);
  const fideRated = /\bFIDE\s+rated\b/i.test(t) && !/\bFIDE\s+Rated:\s*No\b/i.test(t);
  const unrated =
    /\bunrated\s+only\b/i.test(t) ||
    /\bnot\s+(?:US\s*Chess|USCF)[- ]?rated\b/i.test(t);
  const rated =
    !unrated &&
    (/\b(?:US\s*Chess|USCF)[- ]?rated\b/i.test(t) ||
      /\brated\s+tournament\b/i.test(t) ||
      /\bDual\s+Rated\b/i.test(t) ||
      fideRated ||
      true); // TLA/CCA feeds are overwhelmingly rated
  return { rated, fideRated };
}

export function parseEventTextExtras(
  text: string,
  eventName = ""
): ParsedEventExtras {
  const rawSections = parseSectionsFromText(text);
  const { sections, droppedElementary } = reconcileSectionsWithEvent(
    eventName,
    text,
    rawSections
  );
  if (droppedElementary) {
    console.warn(
      `section validation: dropped elementary grade band(s) on adult-oriented event "${eventName.slice(0, 60)}"`
    );
  }
  const entry_fee_cents = parseEntryFeeCents(text);
  const { rated, fideRated } = parseRatedFlags(text);
  return { sections, entry_fee_cents, rated, fideRated };
}

/** Always return at least one section so search rating filters stay usable. */
export function sectionsOrOpenFallback(
  sections: ParsedSectionDraft[]
): ParsedSectionDraft[] {
  return sections.length > 0 ? sections : [openSection("Open")];
}

export function toSectionRows(
  competitionId: string,
  drafts: ParsedSectionDraft[]
): Section[] {
  return sectionsOrOpenFallback(drafts).map((d) => ({
    id: randomUUID(),
    competition_id: competitionId,
    name: d.name,
    min_rating: d.min_rating,
    max_rating: d.max_rating,
    min_grade: d.min_grade,
    max_grade: d.max_grade,
    min_age: null,
    max_age: null,
    gender_restriction: null,
    residency_state: null,
    entry_fee_cents: d.entry_fee_cents,
  }));
}
