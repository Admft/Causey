import type { PathwayNode } from "@/lib/qualification";
import { placementPhrase } from "@/lib/qualification";

/**
 * Renders a qualification walk as readable sentences, not a graph dump —
 * "Win the Texas Scholastic Championship → invited to the Denker…". Uses the
 * design system's path motif (§8.11): a continuous 2px brand-red rail with
 * filled nodes for what's unlocked now, hollow nodes for conditional
 * next hops.
 */

const LEVEL_LABEL: Record<string, string> = {
  local: "Regional",
  state: "State",
  national: "National",
  international: "International",
};

function Node({ node, isFirstHop }: { node: PathwayNode; isFirstHop: boolean }) {
  return (
    <li className="relative pl-6">
      {/* Node marker on the rail: filled = unlocked by the stated result,
          hollow = requires a further result. */}
      <span
        aria-hidden="true"
        className={`absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-red ${
          isFirstHop ? "bg-brand-red" : "bg-surface"
        }`}
      />
      <p className="text-base text-foreground">
        {isFirstHop ? (
          <>
            Invited to the <span className="font-semibold">{node.to_series.name}</span>
          </>
        ) : (
          <>
            Then {placementPhrase(node.required_placement)} there →{" "}
            <span className="font-semibold">{node.to_series.name}</span>
          </>
        )}{" "}
        <span className="text-xs text-muted">
          · {LEVEL_LABEL[node.to_series.level] ?? node.to_series.level}
        </span>
      </p>
      <p className="mt-0.5 max-w-prose text-2xs text-muted">
        {node.rule.notes} (rule last reviewed {node.rule.verified_on})
      </p>
      {node.children.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-0 [&>li]:ml-4">
          {node.children.map((child) => (
            <Node key={child.rule.id + child.to_series.id} node={child} isFirstHop={false} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PathwayList({ nodes }: { nodes: PathwayNode[] }) {
  return (
    <ul className="flex flex-col gap-5 border-l-2 border-brand-red pl-0">
      {nodes.map((node) => (
        <Node key={node.rule.id} node={node} isFirstHop />
      ))}
    </ul>
  );
}
