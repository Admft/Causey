/**
 * Free (no LLM) triage before OpenAI pathway enrichment.
 * Majority of weekend opens → "none". Suspects → AI batch.
 */
import { createHash } from "node:crypto";
import { matchSeriesId } from "./series-match";

/** Bump when prompt/model contract changes so caches re-run. */
const PROMPT_VERSION = "pathway-v2";

/** Names that almost never feed a national/state invitational chain. */
const LIKELY_NONE =
  /\b(swiss|g\/\d+|quick|blitz|rapid|action|quad|team\s*vs|club\s+championship|weekend\s+swiss|open\s+swiss|cash\s+prize|grand\s+prix)\b/i;

/** Names that might be pathway-relevant — spend tokens here. */
const LIKELY_SUSPECT =
  /\b(scholastic|qualifier|qualifying|championship|invitational|denker|barber|rockefeller|haring|junior|k-?\d|elementary|middle\s+school|high\s+school|state\s+champ|national|super\s*nationals|world\s+youth)\b/i;

export type PathwayTriage =
  | { kind: "known_series"; seriesId: string; label: string; summary: string }
  | { kind: "none"; summary: string }
  | { kind: "needs_ai" };

export function triagePathway(name: string, state: string): PathwayTriage {
  const series = matchSeriesId(name, state);
  if (series) {
    return {
      kind: "known_series",
      seriesId: series.seriesId,
      label: series.label,
      summary: `Linked to ${series.label}. Confirm placement rules on the organizer site.`,
    };
  }
  if (LIKELY_SUSPECT.test(name)) return { kind: "needs_ai" };
  if (LIKELY_NONE.test(name)) {
    return {
      kind: "none",
      summary:
        "No qualification pathway in our data. Most open and club events are entry-only — check the organizer site if you expected a qualifier.",
    };
  }
  // Ambiguous short names: cheap default none; AI only if ENRICH_AMBIGUOUS=1
  if (process.env.ENRICH_AMBIGUOUS === "1") return { kind: "needs_ai" };
  return {
    kind: "none",
    summary:
      "No qualification pathway in our data. If this event feeds a state or national invitational, confirm on the organizer site.",
  };
}

export function pathwayInputHash(input: {
  name: string;
  state: string;
  city: string;
  organizer_name: string | null;
  source: string;
  series_id: string | null;
}): string {
  const raw = [
    PROMPT_VERSION,
    input.name.trim().toLowerCase(),
    input.state,
    input.city.trim().toLowerCase(),
    (input.organizer_name ?? "").trim().toLowerCase(),
    input.source,
    input.series_id ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export { PROMPT_VERSION };
