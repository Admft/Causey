/**
 * FIDE Calendar tile parser (calendar.fide.com).
 * Fixture: ingestion/fixtures/fide-calendar-tiles.html
 *
 * Tile CSS classes encode catalog standing:
 *   wfe-tile  — World FIDE Event
 *   wte-tile  — World Top Events
 *   cir-tile  — FIDE Circuit
 *   you-tile  — Youth
 */
import * as cheerio from "cheerio";

export type FideCatalogClass =
  | "world_fide"
  | "world_top"
  | "circuit"
  | "youth"
  | "other";

export type RawFideEvent = {
  name: string;
  city: string;
  /** Free-text location line (may include country). */
  locationText: string;
  /** Raw date header text from the tile. */
  dateText: string;
  timeControl: string | null;
  detailUrl: string;
  catalogClass: FideCatalogClass;
  /** FIDE calendar id from ?id= */
  externalKey: string;
};

function catalogFromClasses(className: string): FideCatalogClass {
  if (/\bwfe-tile\b/.test(className)) return "world_fide";
  if (/\byou-tile\b/.test(className)) return "youth";
  if (/\bcir-tile\b/.test(className)) return "circuit";
  if (/\bwte-tile\b/.test(className)) return "world_top";
  return "other";
}

function dedupeName(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < 4) return t;
  const half = Math.floor(t.length / 2);
  const a = t.slice(0, half).trim();
  const b = t.slice(half).trim();
  if (a && a === b) return a;
  // Common FIDE bug: "NameName" without space
  if (t.length % 2 === 0) {
    const mid = t.length / 2;
    if (t.slice(0, mid) === t.slice(mid)) return t.slice(0, mid);
  }
  return t;
}

/**
 * Tile date headers look like:
 *   "29Jul-28AugSaint Louis, Missouri, USA"
 *   "8-21 AugSaint Louis, USA"
 *   "11-16 AugSan Jose, CRC"
 * Split date from location by finding the first month token end + capital city.
 */
export function splitFideDateLocation(header: string): {
  dateText: string;
  locationText: string;
} {
  const cleaned = header.replace(/\s+/g, " ").trim();
  const m = cleaned.match(
    /^(\d{1,2}(?:\s*[–-]\s*\d{1,2})?\s*[A-Za-z]{3}(?:\s*[–-]\s*\d{1,2}\s*[A-Za-z]{3})?)(.*)$/
  );
  if (m) {
    return {
      dateText: m[1].replace(/\s+/g, " ").trim(),
      locationText: m[2].replace(/\s+/g, " ").trim(),
    };
  }
  // "29Jul-28Aug..." glued
  const glued = cleaned.match(
    /^(\d{1,2}[A-Za-z]{3}(?:\s*[–-]\s*\d{1,2}[A-Za-z]{3})?)(.*)$/
  );
  if (glued) {
    return {
      dateText: glued[1].replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/([a-z])(\d)/gi, "$1 $2"),
      locationText: glued[2].replace(/\s+/g, " ").trim(),
    };
  }
  return { dateText: cleaned, locationText: "" };
}

export function parseFideCalendarHtml(html: string): RawFideEvent[] {
  const $ = cheerio.load(html);
  const out: RawFideEvent[] = [];
  const seen = new Set<string>();

  $(".calendar-t-tile").each((_, el) => {
    const tile = $(el);
    const className = tile.attr("class") ?? "";
    const name = dedupeName(
      tile.find(".tile-header-name, .t-tile-header-name").first().text()
    );
    if (name.length < 3) return;

    const city = tile.find(".t-tile-city").first().text().replace(/\s+/g, " ").trim();
    const headerDate = tile
      .find(".t-tile-header-date")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const { dateText, locationText } = splitFideDateLocation(headerDate);
    const timeControl =
      tile
        .find(".t-tile-start")
        .text()
        .replace(/Time control:\s*/i, "")
        .replace(/\s+/g, " ")
        .trim() || null;

    let href =
      tile.find("a[href*='calendar.php?id=']").first().attr("href") ||
      tile.closest("a").attr("href") ||
      "";
    if (!href) {
      // Sometimes the whole tile is wrapped; look at siblings
      href =
        tile.parent().find("a[href*='calendar.php?id=']").first().attr("href") ||
        "";
    }
    if (!href) return;
    const abs = href.startsWith("http")
      ? href
      : `https://calendar.fide.com/${href.replace(/^\//, "")}`;
    let externalKey = "";
    try {
      externalKey = new URL(abs).searchParams.get("id") ?? "";
    } catch {
      return;
    }
    if (!externalKey || seen.has(externalKey)) return;
    seen.add(externalKey);

    out.push({
      name,
      city: city || locationText.split(",")[0]?.trim() || "Unknown",
      locationText: locationText || city,
      dateText,
      timeControl,
      detailUrl: abs,
      catalogClass: catalogFromClasses(className),
      externalKey,
    });
  });

  return out;
}
