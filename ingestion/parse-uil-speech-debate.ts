import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

export const UIL_INVITATIONAL_MEETS_URL =
  "https://www.uiltexas.org/academics/invitational-meets-test";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function speechDebateFacets(value: string): string[] {
  const facets = new Set<string>();
  if (/\b(?:LD|Lincoln[- ]Douglas)\b/i.test(value)) {
    facets.add("lincoln_douglas");
  }
  if (/\b(?:CX|Cross[- ]Examination|Policy)\b/i.test(value)) {
    facets.add("policy");
  }
  if (/\bCongress(?:ional)?\b/i.test(value)) facets.add("congress");
  if (
    /\b(?:speech|extemp|informative|persuasive|prose|poetry|interp(?:retation)?)\b/i.test(
      value
    )
  ) {
    facets.add("speech");
  }
  return [...facets];
}

function parsedLocation(
  hostHtml: string,
  venueName: string
): {
  venueName: string;
  address: string;
  city: string;
  zip: string;
} | null {
  const withLines = hostHtml.replace(/<br\s*\/?>/gi, "\n");
  const lines = cheerio
    .load(withLines)
    .root()
    .text()
    .split(/\n/)
    .map(cleanText)
    .filter(Boolean);
  const locationText = lines.filter((line) => line !== venueName).join("\n");
  const match = locationText.match(
    /(?:^|,|\n)\s*([A-Za-z][A-Za-z .'-]+),?\s+(?:TX|Texas),?\s*(\d{5})\s*$/i
  );
  if (!venueName || !match) return null;
  const address = cleanText(
    locationText.slice(0, match.index).replace(/[,\s]+$/, "")
  );
  if (!address) return null;
  return {
    venueName,
    address,
    city: cleanText(match[1]),
    zip: match[2],
  };
}

export function parseUilSpeechDebateHtml(
  html: string,
  detailUrl = UIL_INVITATIONAL_MEETS_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const title = cleanText($("title").text());
  const heading = cleanText($("h1").first().text());
  if (
    !/University Interscholastic League|UIL/i.test(title) ||
    !/Academic Invitational Meets and Tournaments/i.test(heading)
  ) {
    return [];
  }

  const events: RawCategoryEvent[] = [];
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 5) return;
    const dateText = cleanText(cells.eq(0).text());
    const dates = parseNamedDateRange(dateText);
    const hostCell = cells.eq(1);
    const location = parsedLocation(
      hostCell.html() ?? "",
      cleanText(hostCell.find("strong").first().text())
    );
    const info = cleanText(cells.eq(3).text());
    const materials = cleanText(cells.eq(4).text());
    const evidence = `${info} ${materials}`;
    const positiveEvidence = evidence.replace(
      /\b(?:no|except|excluding)\b[^.!;]*/gi,
      " "
    );
    const practiceOnly =
      /\b(?:workshop|practice)\b/i.test(evidence) &&
      !/\b(?:tournament|invitational|debates? will take place|we will (?:offer|host).*(?:speech|debate)|all (?:UIL )?events)\b/i.test(
        evidence
      );
    if (
      !dates ||
      !location ||
      practiceOnly ||
      !/\b(?:speech|debate|Congress(?:ional)?|LD|CX)\b/i.test(
        positiveEvidence
      ) ||
      /\b(?:no|except)\s+(?:speech(?:\s+or|\/| and)?\s*)?debate\b/i.test(evidence)
    ) {
      return;
    }

    const facets = speechDebateFacets(positiveEvidence);
    if (facets.length === 0) return;
    const year = dates.start.slice(0, 4);
    const keyHost = location.venueName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const virtual = /\bvirtual(?:ly)?\b/i.test(evidence);
    const inPerson = /\bin[- ]person\b/i.test(evidence);

    events.push({
      externalKey: `${dates.start}-${keyHost}`,
      name: `${year} ${location.venueName} Speech & Debate Event`,
      detailUrl,
      registrationUrl: null,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: null,
      participationMode:
        virtual && inPerson ? "hybrid" : virtual ? "online" : "in_person",
      venueName: virtual && !inPerson ? null : location.venueName,
      address: virtual && !inPerson ? null : location.address,
      city: virtual && !inPerson ? null : location.city,
      state: virtual && !inPerson ? null : "TX",
      zip: virtual && !inPerson ? null : location.zip,
      facets,
      eventType: "UIL invitational speech and debate event",
      availability:
        "listed on the official UIL invitational calendar; confirm schedule and registration with the host",
      entryFeeCents: null,
    });
  });
  return events;
}
