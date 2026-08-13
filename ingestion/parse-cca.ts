/**
 * Parsers for Continental Chess Association schedule pages.
 * Listing: https://www.chesstour.com/refs.html
 * Detail:  https://www.chesstour.com/so26.htm etc. (old Word HTML)
 */
import { load } from "cheerio";
import { extractPageImage } from "./extract-page-image";
import { stateToCode } from "./normalize";
import {
  CCA_LISTING_URL,
  parseCcaDateRange,
  RawCcaSchema,
  yearForCcaMonth,
  type CcaDetailEnrichment,
  type RawCca,
} from "./normalize-cca";

/** Strip Word bullets / spacer junk that leaks into names & cities. */
export function cleanCcaText(s: string): string {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\u00a0\u2000-\u200b\u2028\u2029\ufeff]/g, " ")
    .replace(/[•·▪◦►◆●]/g, " ")
    // Word HTML often glues camelCase / ALLCAPS tokens together.
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // "OpenJuly31" → "Open July31" (do not split "56th")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    // "601North" / "1Bradley" → spaced (skip ordinals)
    .replace(/(\d)(?!(?:st|nd|rd|th)\b)([A-Za-z])/gi, "$1 $2")
    .replace(/,([A-Za-z])/g, ", $1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cheerio .text() collapses Word spans with no spaces — insert breaks first. */
function bodyTextFromHtml(html: string): string {
  const spaced = html
    .replace(/<\/(p|div|tr|h[1-6]|li|br)[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/span>/gi, " ");
  const $ = load(spaced);
  return cleanCcaText($("body").text().replace(/\u00a0/g, " "));
}

function softenAllCapsName(name: string): string {
  let cleaned = cleanCcaText(name)
    .replace(/\s*[-–]\s*$/g, "")
    .trim();
  // ATLANTICOPEN → ATLANTIC OPEN before title-casing
  cleaned = cleaned
    .replace(/(OPEN|BLITZ|CLASS|CONGRESS|CHAMPIONSHIPS?)$/i, " $1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 4 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) {
    return cleaned
      .toLowerCase()
      .replace(/\b([a-z])/g, (c) => c.toUpperCase());
  }
  return cleaned;
}

const SKIP_LEAVES = new Set([
  "byes.htm",
  "disconnect.htm",
  "foreignratings.htm",
  "jas.htm",
  "mr.htm",
  "privacy.htm",
  "taxes.htm",
  "peakrating.htm",
  "devices.htm",
  "refs.html",
  "offsiteparkngoptionsnearomnihotelindc.htm",
  "worldopenandsideevents-2026.htm",
]);

/** Event detail leaves look like so26.htm, pit26.htm, bradb26.htm (blitz). */
function isEventLeaf(leaf: string): boolean {
  const l = leaf.toLowerCase();
  if (SKIP_LEAVES.has(l)) return false;
  return /^[a-z]+\d{2}\.html?$/.test(l);
}

function absoluteCcaUrl(href: string): string {
  if (href.startsWith("http")) {
    return href
      .replace("http://", "https://")
      .replace("://chesstour.com", "://www.chesstour.com");
  }
  return new URL(href, CCA_LISTING_URL).toString();
}

function ccaExternalKey(detailUrl: string): string {
  const url = new URL(detailUrl);
  const leaf = url.pathname.split("/").pop()?.toLowerCase() ?? url.pathname;
  return url.hash ? `${leaf}${url.hash.toLowerCase()}` : leaf;
}

/**
 * Listing cards are Word junk — pull event .htm links and scrape nearby text
 * for "Month D-D: Name, City, ST".
 */
export function parseCcaListingHtml(html: string): RawCca[] {
  const $ = load(html);
  const byUrl = new Map<string, RawCca>();

  $("a[href]").each((_, a) => {
    const href = ($(a).attr("href") ?? "").trim();
    if (!href) return;
    let leaf = "";
    try {
      leaf = new URL(absoluteCcaUrl(href)).pathname.split("/").pop()?.toLowerCase() ?? "";
    } catch {
      return;
    }
    if (!isEventLeaf(leaf)) return;

    const detailUrl = absoluteCcaUrl(href);
    const isBlitz = /b\d{2}\.html?$/i.test(leaf) || /blitz/i.test($(a).text());

    let blob = "";
    let node = $(a).parent();
    for (let i = 0; i < 8 && node.length; i++) {
      blob = node.text().replace(/\s+/g, " ").trim();
      if (
        /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(
          blob
        ) &&
        blob.length > 30
      ) {
        break;
      }
      node = node.parent();
    }

    const parsedLine = parseScheduleSnippet(blob, isBlitz);
    const candidate = parsedLine
      ? {
          externalKey: ccaExternalKey(detailUrl),
          name: parsedLine.name,
          dateText: parsedLine.dateText,
          city: parsedLine.city,
          state: parsedLine.state,
          detailUrl,
          isBlitz,
        }
      : {
          externalKey: ccaExternalKey(detailUrl),
          // Detail page fills these; placeholders keep Zod happy until then.
          name: isBlitz ? `CCA Blitz (${leaf})` : `CCA Event (${leaf})`,
          dateText: "January 1, 2099",
          city: "Unknown",
          state: "NY",
          detailUrl,
          isBlitz,
        };

    const validated = RawCcaSchema.safeParse(candidate);
    if (!validated.success) return;
    const prev = byUrl.get(detailUrl);
    if (!prev || (parsedLine && prev.city === "Unknown")) {
      byUrl.set(detailUrl, validated.data);
    }
  });

  return [...byUrl.values()];
}

function parseScheduleSnippet(
  text: string,
  isBlitz: boolean
): { name: string; dateText: string; city: string; state: string } | null {
  const m = text.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:[^:]{0,40})?):\s*([^,]+),\s*([^,]+?),\s*([A-Z]{2})\b/i
  );
  if (!m) return null;
  const monthToken = m[1].match(/[A-Za-z]+/)?.[0] ?? "";
  const year = yearForCcaMonth(monthToken);
  const dateText = `${cleanCcaText(m[1])}, ${year}`;
  let name = cleanCcaText(m[2].replace(/\bENTER NOW\b/gi, ""));
  if (isBlitz && !/blitz/i.test(name)) name = `${name} Blitz`;
  const city = cleanCcaText(m[3].replace(/\s*\(near [^)]+\)\s*/i, ""));
  const state = stateToCode(m[4]) ?? m[4].toUpperCase();
  if (state.length !== 2) return null;
  return { name, dateText, city, state };
}

/** Harvest "COMING EVENTS" plain lines that may not have detail pages yet. */
export function parseCcaComingEvents(
  html: string,
  now = new Date()
): RawCca[] {
  const text = bodyTextFromHtml(html);
  const rows: RawCca[] = [];
  // Optional year prefix: "2026 Nov 27-29" or "2027 Jan 8-10"
  const re =
    /\b(?:(20\d{2})\s*)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:\s*,\s*\d{1,2}\s*[-–]\s*\d{1,2})?):\s*([^,]+),\s*([^,]+?),\s*([A-Z]{2})(?![A-Za-z])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const monthToken = m[2].match(/[A-Za-z]+/)?.[0] ?? "";
    let year = m[1] ? Number(m[1]) : yearForCcaMonth(monthToken, now);
    let dateText = `${cleanCcaText(m[2])}, ${year}`;
    let dates = parseCcaDateRange(dateText, year);
    if (!dates) continue;
    // Explicit year on the page can still be stale for near-term months.
    const startMs = Date.parse(`${dates.start}T12:00:00Z`);
    if (Number.isFinite(startMs) && startMs < now.getTime() - 3 * 86_400_000) {
      year += 1;
      dateText = `${cleanCcaText(m[2])}, ${year}`;
      dates = parseCcaDateRange(dateText, year);
      if (!dates) continue;
    }
    const name = cleanCcaText(m[3]);
    if (/ENTER NOW|HOTEL|CLICK HERE|PLEASE|COMING EVENTS/i.test(name)) continue;
    const city = cleanCcaText(m[4].replace(/\s*\(near [^)]+\)\s*/i, ""));
    const state = stateToCode(m[5]) ?? m[5].toUpperCase();
    if (state.length !== 2) continue;
    const slug = `${name}-${dateText}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    const detailUrl = `${CCA_LISTING_URL}#coming-${slug}`;
    const candidate = {
      externalKey: `coming:${slug}`,
      name,
      dateText,
      city,
      state,
      detailUrl,
      isBlitz: false,
    };
    const parsed = RawCcaSchema.safeParse(candidate);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

function titleFromBody(bodyText: string): string | null {
  const annualBeforeMonth = bodyText.match(
    /\b(?:\d{1,3}(?:st|nd|rd|th)\s+annual\s+)([A-Za-z][A-Za-z0-9 .'/&-]{2,50}?)(?=\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b)/i
  );
  const annualBlitz = bodyText.match(
    /\b(?:\d{1,3}(?:st|nd|rd|th)\s+annual\s+)([A-Za-z][A-Za-z0-9 .'/&-]{2,50}?)(?=\s+(?:BLITZ|CHAMPIONSHIP|!))/i
  );
  const raw = annualBeforeMonth?.[1] ?? annualBlitz?.[1] ?? null;
  if (!raw) return null;
  if (
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(
      raw
    )
  ) {
    return null;
  }
  return softenAllCapsName(raw);
}

export function parseCcaDetailHtml(html: string, pageUrl?: string): CcaDetailEnrichment {
  const $ = load(html);
  const title = cleanCcaText($("title").first().text());
  let titleName =
    title
      .replace(/\s*chess tournament\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim() || null;
  if (titleName && /^cca event/i.test(titleName)) titleName = null;

  const bodyText = bodyTextFromHtml(html);
  if (!titleName) titleName = titleFromBody(bodyText);

  // CCA schedules often list several options: "August 13-16, 14-16 or 15-16, 2026"
  const dateMatch = bodyText.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:(?:,\s*\d{1,2}(?:\s*[-–]\s*\d{1,2})?)*(?:\s+or\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?)*)?,\s*20\d{2})/i
  );
  const dateText = dateMatch?.[1] ?? null;
  const dates = dateText ? parseCcaDateRange(dateText) : null;

  // Strip "(near Boston)" / "(1 mile from …)" notes so City, ST ZIP matching works.
  const addrBlob = bodyText
    .replace(/\s*\(near [^)]+\)\s*/gi, " ")
    .replace(/\s*\([^)]{0,80}\)\s*/g, " ");

  // Prefer street-type addresses to avoid matching prize fragments.
  // Longer suffixes first; word boundaries so "Dr" does not fire inside "Drive".
  const STREET =
    String.raw`\d{1,5}\s+[A-Za-z0-9 .'#/-]{0,40}\b(?:Street|Road|Avenue|Drive|Boulevard|Lane|Court|Parkway|Airport|Blvd|Ave|Pkwy|Rd|Ln|Ct|Way|Dr|St)\.?`;

  const addrMatch =
    addrBlob.match(
      new RegExp(
        `(${STREET}),?\\s*(?:(?:N|S|E|W|NE|NW|SE|SW)\\.?,?\\s+)?([A-Za-z .'-]+),\\s*([A-Za-z]{2,})\\s+(\\d{5})(?:-\\d{4})?\\b`,
        "i"
      )
    ) ??
    addrBlob.match(
      new RegExp(
        `(${STREET}),?\\s*(?:(?:N|S|E|W|NE|NW|SE|SW)\\.?,?\\s+)?([A-Za-z .'-]+?)\\s+([A-Za-z]{2,})\\s+(\\d{5})(?:-\\d{4})?\\b`,
        "i"
      )
    ) ??
    // "189 Wolf Road, Albany 12205" (state omitted)
    addrBlob.match(
      new RegExp(`(${STREET}),?\\s*([A-Za-z .'-]+?)\\s+(\\d{5})(?:-\\d{4})?\\b`, "i")
    );
  let venueName: string | null = null;
  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  if (addrMatch) {
    address = cleanCcaText(addrMatch[1]);
    city = cleanCcaText(addrMatch[2]);
    if (addrMatch.length >= 5 && addrMatch[4]) {
      // groups: addr, city, state, zip
      state = stateToCode(addrMatch[3]) ?? (addrMatch[3].length === 2 ? addrMatch[3].toUpperCase() : null);
      zip = addrMatch[4];
    } else {
      // groups: addr, city, zip (no state)
      zip = addrMatch[3];
    }
  }

  // Require a real street number after the hotel name (avoid "$30,000" false hits).
  const hotelMatch = bodyText.match(
    /((?:Holiday Inn|Hilton|Marriott|Hyatt|Omni|Sheraton|Westin|DoubleTree|Embassy Suites|Best Western|Crowne Plaza|Renaissance)[^.,$]{0,60}?),\s*\d{1,5}\s+[A-Za-z]/i
  );
  if (hotelMatch) venueName = cleanCcaText(hotelMatch[1]);

  if (!state) {
    for (const [name, code] of Object.entries({
      florida: "FL",
      "new york": "NY",
      pennsylvania: "PA",
      illinois: "IL",
      connecticut: "CT",
      california: "CA",
      massachusetts: "MA",
      indiana: "IN",
      nevada: "NV",
      ohio: "OH",
      "new jersey": "NJ",
      virginia: "VA",
      "district of columbia": "DC",
      "washington dc": "DC",
    })) {
      if (new RegExp(`\\b${name}\\b`, "i").test(bodyText.slice(0, 800))) {
        state = code;
        break;
      }
    }
  }

  return {
    venueName,
    address,
    city,
    state,
    zip,
    titleName,
    dateText,
    endDate: dates?.end ?? null,
    imageUrl: extractPageImage(html, pageUrl || CCA_LISTING_URL),
    bodyText: bodyText || null,
  };
}
