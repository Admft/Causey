/**
 * OnlineRegistration.cc current-tournaments index parser.
 * Fixture: ingestion/fixtures/onlinereg-tournaments-index.html
 *
 * Each event is a title link with view=zNTizdLa&tid=… plus nearby State / dates.
 */
import * as cheerio from "cheerio";

export type RawOnlineRegEvent = {
  name: string;
  /** tid query value (may include == padding). */
  tid: string;
  detailUrl: string;
  regUrl: string;
  stateName: string | null;
  startText: string | null;
  endText: string | null;
  entryCount: number | null;
  organizerHint: string | null;
};

const MONTH_DAY_YEAR =
  /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s*-\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/;

export function parseOnlineRegIndexHtml(html: string): RawOnlineRegEvent[] {
  const $ = cheerio.load(html);
  const out: RawOnlineRegEvent[] = [];
  const seen = new Set<string>();

  $('a[href*="view=zNTizdLa"][href*="tid="]').each((_, a) => {
    const href = $(a).attr("href") ?? "";
    let tid = "";
    try {
      tid = new URL(href, "https://onlineregistration.cc").searchParams.get("tid") ?? "";
    } catch {
      return;
    }
    if (!tid || seen.has(tid)) return;

    const name = $(a).text().replace(/\s+/g, " ").trim();
    if (name.length < 3) return;
    if (/^(Buy One|Closed!|Entry List)/i.test(name)) return;

    // Walk up until we find State + date range for this event.
    let node = $(a).parent();
    let blockText = "";
    let entryCount: number | null = null;
    for (let i = 0; i < 10 && node.length; i += 1) {
      const t = node.text().replace(/\s+/g, " ").trim();
      if (MONTH_DAY_YEAR.test(t) && /State:\s*[A-Za-z]/.test(t)) {
        // Prefer the slice around this event name to avoid sibling bleed.
        const idx = t.indexOf(name);
        blockText = idx >= 0 ? t.slice(idx, idx + name.length + 180) : t.slice(0, 220);
        const entryLink = node
          .find(`a[href*="advance_entry"][href*="tid=${tid}"], a[href*="advance_entry_list.php?tid=${encodeURIComponent(tid)}"]`)
          .first();
        // Fallback: any advance_entry near this anchor
        const entryText =
          entryLink.text() ||
          $(a)
            .parent()
            .parent()
            .find('a[href*="advance_entry"]')
            .first()
            .text();
        const em = entryText.match(/[\[{](\d+)[\]}]/);
        if (em) entryCount = Number(em[1]);
        break;
      }
      node = node.parent();
    }

    if (!blockText) {
      blockText = $(a).parent().text().replace(/\s+/g, " ").trim();
    }

    const stateName = blockText.match(/State:\s*([A-Za-z ]+?)(?:\s+Buy|\s+Entry|\s+Pair|$)/)?.[1]?.trim() ?? null;
    const dates = blockText.match(MONTH_DAY_YEAR);
    const absDetail = href.startsWith("http")
      ? href
      : `https://onlineregistration.cc/${href.replace(/^\//, "")}`;
    const regUrl = `https://onlineregistration.cc/tournaments/index.php?view=zNTizdLa&tid=${encodeURIComponent(tid)}`;

    // Organizer often sits just above the title in the panel heading.
    const panel = $(a).closest(".panel, .panel-default, .shadow-sm");
    const organizerHint =
      panel
        .find("a")
        .filter((_, el) => {
          const t = $(el).text().replace(/\s+/g, " ").trim();
          return t.length > 2 && t !== name && !/View Pairings|Buy |Entry List|Closed|Pair /i.test(t);
        })
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim() || null;

    seen.add(tid);
    out.push({
      name,
      tid,
      detailUrl: absDetail,
      regUrl,
      stateName,
      startText: dates?.[1] ?? null,
      endText: dates?.[2] ?? null,
      entryCount,
      organizerHint,
    });
  });

  return out;
}
