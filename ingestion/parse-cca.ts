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
  type CcaDetailEnrichment,
  type RawCca,
} from "./normalize-cca";

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
          name: parsedLine.name,
          dateText: parsedLine.dateText,
          city: parsedLine.city,
          state: parsedLine.state,
          detailUrl,
          isBlitz,
        }
      : {
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
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:[^:]{0,40})?):\s*([^,]+),\s*([^,]+?),\s*([A-Z]{2})\b/i
  );
  if (!m) return null;
  const dateText = `${m[1].trim()}, 2026`;
  let name = m[2].replace(/\s+/g, " ").trim();
  name = name.replace(/\bENTER NOW\b/gi, "").trim();
  if (isBlitz && !/blitz/i.test(name)) name = `${name} Blitz`;
  let city = m[3].replace(/\s+/g, " ").trim();
  city = city.replace(/\s*\(near [^)]+\)\s*/i, "").trim();
  const state = stateToCode(m[4]) ?? m[4].toUpperCase();
  if (state.length !== 2) return null;
  return { name, dateText, city, state };
}

/** Harvest "COMING EVENTS" plain lines that may not have detail pages yet. */
export function parseCcaComingEvents(html: string, defaultYear = 2026): RawCca[] {
  const $ = load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const rows: RawCca[] = [];
  const re =
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:\s*,\s*\d{1,2}\s*[-–]\s*\d{1,2})?):\s*([^,]+),\s*([^,]+?),\s*([A-Z]{2})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const dateText = `${m[1].trim()}, ${defaultYear}`;
    if (!parseCcaDateRange(dateText, defaultYear)) continue;
    const name = m[2].replace(/\s+/g, " ").trim();
    if (/ENTER NOW|HOTEL|CLICK HERE|PLEASE/i.test(name)) continue;
    const city = m[3]
      .replace(/\s*\(near [^)]+\)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const state = stateToCode(m[4]) ?? m[4].toUpperCase();
    if (state.length !== 2) continue;
    const slug = `${name}-${dateText}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    const detailUrl = `${CCA_LISTING_URL}#coming-${slug}`;
    const candidate = { name, dateText, city, state, detailUrl, isBlitz: false };
    const parsed = RawCcaSchema.safeParse(candidate);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

export function parseCcaDetailHtml(html: string, pageUrl?: string): CcaDetailEnrichment {
  const $ = load(html);
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const titleName =
    title
      .replace(/\s*chess tournament\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim() || null;

  const bodyText = $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

  const dateMatch = bodyText.match(
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:\s+or\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?)?,\s*20\d{2})/i
  );
  const dateText = dateMatch?.[1] ?? null;
  const dates = dateText ? parseCcaDateRange(dateText) : null;

  const addrMatch = bodyText.match(
    /([0-9][^,]{3,60}),\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\b/
  );
  let venueName: string | null = null;
  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  if (addrMatch) {
    address = addrMatch[1].replace(/\s+/g, " ").trim();
    city = addrMatch[2].replace(/\s+/g, " ").trim();
    state = stateToCode(addrMatch[3]) ?? addrMatch[3];
    zip = addrMatch[4];
  }

  const hotelMatch = bodyText.match(
    /((?:Holiday Inn|Hilton|Marriott|Hyatt|Omni|Sheraton|Westin|DoubleTree|Embassy Suites|Best Western|Crowne Plaza|Renaissance)[^.]{0,80}?),\s*\d/i
  );
  if (hotelMatch) venueName = hotelMatch[1].replace(/\s+/g, " ").trim();

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
  };
}
