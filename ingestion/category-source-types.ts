export type RawCategoryEvent = {
  externalKey: string;
  name: string;
  detailUrl: string;
  /** Undefined uses detailUrl; null means the source offers no direct registration. */
  registrationUrl?: string | null;
  /** Separate official page used to support parsed location fields, when needed. */
  locationSourceUrl?: string;
  /** Separate official page supporting the parsed registration deadline. */
  deadlineSourceUrl?: string;
  /** Clarifies when start/end represent a published deadline rather than an event span. */
  dateSemantics?: "submission_deadline";
  startDate: string;
  endDate: string | null;
  regDeadline: string | null;
  participationMode: "in_person" | "online" | "hybrid";
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  facets: string[];
  /** Explicit source-published classifications, divisions, or conferences. */
  classifications?: string[];
  eventType: string | null;
  availability: string;
  entryFeeCents: number | null;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const pad = (value: number) => String(value).padStart(2, "0");

export function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseNamedDate(text: string): string | null {
  const match = text
    .replace(/,/g, " ")
    .match(
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\b/i
    );
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  return month ? isoDate(Number(match[3]), month, Number(match[2])) : null;
}

export function parseNamedDateRange(
  text: string
): { start: string; end: string | null } | null {
  const normalized = text.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const crossMonthRange = normalized.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\b/i
  );
  if (crossMonthRange) {
    const startMonth = MONTHS[crossMonthRange[1].toLowerCase()];
    const endMonth = MONTHS[crossMonthRange[3].toLowerCase()];
    if (!startMonth || !endMonth) return null;
    const year = Number(crossMonthRange[5]);
    const start = isoDate(year, startMonth, Number(crossMonthRange[2]));
    const end = isoDate(year, endMonth, Number(crossMonthRange[4]));
    return start && end ? { start, end } : null;
  }
  const range = normalized.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(\d{4})\b/i
  );
  if (range) {
    const month = MONTHS[range[1].toLowerCase()];
    if (!month) return null;
    const start = isoDate(Number(range[4]), month, Number(range[2]));
    const end = isoDate(Number(range[4]), month, Number(range[3]));
    return start ? { start, end } : null;
  }
  const start = parseNamedDate(normalized);
  return start ? { start, end: null } : null;
}

export function parseDashDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})-([A-Za-z]{3})-(\d{4})\b/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  return month ? isoDate(Number(match[3]), month, Number(match[1])) : null;
}
