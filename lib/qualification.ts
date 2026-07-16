import type { QualificationRule, Series } from "@/lib/schemas";

/**
 * The qualification pathway engine.
 *
 * Pure recursive walk over qualification_rules — no I/O, no framework. The
 * caller supplies the rules and a series lookup (from the DataSource) and a
 * starting point: an event and/or its series, plus the placement the student
 * is asking about ("if I win" = 1, "if I get 3rd" = 3).
 *
 * Hop 1 is placement-sensitive: an edge is followed only when the student's
 * placement is good enough (placement <= rule.required_placement, so 2nd
 * place satisfies a top-3 rule but not a champions-only rule).
 *
 * Hops 2+ are conditional futures — "and if you then finish top N *there*,
 * that unlocks…" — so every edge out of the unlocked series is included,
 * annotated with the placement it would require. Depth is capped (default 3
 * edges) and a visited set breaks cycles.
 */

export const PLACEMENTS = {
  1: "1st place",
  3: "top 3",
  // Sentinel for "participated, no placement". No real rule keys on mere
  // participation, so this deliberately unlocks nothing — the UI explains
  // that honestly rather than inventing edges.
  99: "participated",
} as const;

export interface PathwayStart {
  /** Series the starting event belongs to, if any. */
  series_id?: string | null;
  /** Specific competition, for rules keyed directly on one event. */
  competition_id?: string | null;
  /** 1 = won, 3 = finished top 3, 99 = participated (see PLACEMENTS). */
  placement: number;
}

export interface PathwayNode {
  rule: QualificationRule;
  to_series: Series;
  /** Placement the rule demands (1 = win, 3 = top 3, …). */
  required_placement: number;
  /**
   * Depth 1 nodes are unlocked *now* by the student's stated placement.
   * Deeper nodes are conditional on a future result at the parent series.
   */
  depth: number;
  children: PathwayNode[];
}

export function walkPathways(
  start: PathwayStart,
  rules: QualificationRule[],
  seriesById: Map<string, Series>,
  maxDepth = 3
): PathwayNode[] {
  const firstHop = rules.filter(
    (r) =>
      ((start.series_id && r.from_series_id === start.series_id) ||
        (start.competition_id && r.from_competition_id === start.competition_id)) &&
      start.placement <= r.required_placement
  );

  const visited = new Set<string>();
  if (start.series_id) visited.add(start.series_id);

  return firstHop
    .map((rule) => buildNode(rule, 1, rules, seriesById, maxDepth, visited))
    .filter((n): n is PathwayNode => n !== null);
}

function buildNode(
  rule: QualificationRule,
  depth: number,
  rules: QualificationRule[],
  seriesById: Map<string, Series>,
  maxDepth: number,
  visited: Set<string>
): PathwayNode | null {
  const to_series = seriesById.get(rule.to_series_id);
  if (!to_series) return null; // dangling edge in data — skip, never crash
  if (visited.has(to_series.id)) return null; // cycle guard

  const nextVisited = new Set(visited);
  nextVisited.add(to_series.id);

  const children =
    depth >= maxDepth
      ? []
      : rules
          .filter((r) => r.from_series_id === to_series.id)
          .map((r) => buildNode(r, depth + 1, rules, seriesById, maxDepth, nextVisited))
          .filter((n): n is PathwayNode => n !== null);

  return {
    rule,
    to_series,
    required_placement: rule.required_placement,
    depth,
    children,
  };
}

/** Human phrasing for a required placement: "win" / "finish top 3". */
export function placementPhrase(required: number): string {
  return required === 1 ? "win" : `finish top ${required}`;
}
