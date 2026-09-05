import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";
import { Card, Kicker, Meta } from "./ui";

/**
 * Phone “what winning unlocks” panel. Reads the JSON from
 * GET /api/competitions/[slug] — `{ competition, unlocks }` — where unlocks
 * is the walkPathways tree (PathwayNode[]). Chess hops are seeded scaffolding;
 * other types usually have none. Never invent a chain.
 */

export const EMPTY_PATHWAY_COPY =
  "No qualification pathway in our data. Most events are open entry.";

export const UNCERTAIN_PATHWAY_COPY =
  "We are not sure whether this event feeds a qualifier. Check the organizer.";

const LEVEL_LABEL: Record<string, string> = {
  local: "Regional",
  state: "State",
  national: "National",
  international: "International",
};

type Hop = {
  name: string;
  level: string;
  requiredPlacement: number;
  notes: string | null;
  verifiedOn: string | null;
  children: Hop[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function placementPhrase(required: number): string {
  return required === 1 ? "win" : `finish top ${required}`;
}

/** Map one JSON PathwayNode; skip dangling/malformed hops instead of inventing. */
export function readPathwayHop(value: unknown): Hop | null {
  const node = asRecord(value);
  if (!node) return null;
  const series = asRecord(node.to_series);
  const name = typeof series?.name === "string" ? series.name.trim() : "";
  if (!name) return null;
  const level = typeof series?.level === "string" ? series.level : "";
  const rule = asRecord(node.rule);
  const required =
    typeof node.required_placement === "number"
      ? node.required_placement
      : typeof rule?.required_placement === "number"
        ? rule.required_placement
        : null;
  if (required == null) return null;
  const notes = typeof rule?.notes === "string" ? rule.notes : null;
  const verifiedOn =
    typeof rule?.verified_on === "string" ? rule.verified_on : null;
  const children = Array.isArray(node.children)
    ? node.children
        .map(readPathwayHop)
        .filter((hop): hop is Hop => hop !== null)
    : [];
  return {
    name,
    level,
    requiredPlacement: required,
    notes,
    verifiedOn,
    children,
  };
}

export function hopHeadline(hop: Hop, isFirstHop: boolean): string {
  const level = LEVEL_LABEL[hop.level] ?? hop.level;
  const tail = level ? ` · ${level}` : "";
  if (isFirstHop) return `Invited to the ${hop.name}${tail}`;
  return `Then ${placementPhrase(hop.requiredPlacement)} there → ${hop.name}${tail}`;
}

function HopRow({ hop, isFirstHop }: { hop: Hop; isFirstHop: boolean }) {
  const note = hop.notes
    ? `${hop.notes}${hop.verifiedOn ? ` (rule last reviewed ${hop.verifiedOn})` : ""}`
    : hop.verifiedOn
      ? `Rule last reviewed ${hop.verifiedOn}`
      : null;
  return (
    <View>
      <Text style={styles.hop}>{hopHeadline(hop, isFirstHop)}</Text>
      {note ? <Meta>{note}</Meta> : null}
      {hop.children.map((child, index) => (
        <View key={`${child.name}-${index}`} style={styles.child}>
          <HopRow hop={child} isFirstHop={false} />
        </View>
      ))}
    </View>
  );
}

export function EventPathways({
  unlocks,
  pathwayStatus,
  pathwaySummary,
}: {
  unlocks: unknown[];
  pathwayStatus?: string | null;
  pathwaySummary?: string | null;
}) {
  const hops = (Array.isArray(unlocks) ? unlocks : [])
    .map(readPathwayHop)
    .filter((hop): hop is Hop => hop !== null);
  const status =
    pathwayStatus == null || pathwayStatus === "" ? "none" : pathwayStatus;

  if (hops.length === 0 && status !== "uncertain" && status !== "known") {
    return <Meta>{EMPTY_PATHWAY_COPY}</Meta>;
  }

  return (
    <Card>
      <Kicker>What winning unlocks</Kicker>
      {status === "uncertain" ? (
        <Meta>{UNCERTAIN_PATHWAY_COPY}</Meta>
      ) : null}
      {pathwaySummary ? <Meta>{pathwaySummary}</Meta> : null}
      {hops.length === 0 && status === "known" && !pathwaySummary ? (
        <Meta>
          No placement chain in our data. Check the organizer.
        </Meta>
      ) : null}
      {hops.map((hop, index) => (
        <View key={`${hop.name}-${index}`} style={styles.hopBlock}>
          <HopRow hop={hop} isFirstHop />
        </View>
      ))}
      {hops.length > 0 ? (
        <Meta>
          Chess pathways in Causey are seeded and incomplete. Check the
          organizer before traveling or claiming a qualifier seat.
        </Meta>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hopBlock: { marginTop: 12 },
  hop: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 20,
  },
  child: {
    marginTop: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
  },
});
