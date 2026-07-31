/**
 * Home hero visual — the Pathway Network Map.
 * Stylized isometric node map of a qualification pathway: local events feed
 * into a state affiliate node, which feeds a national invitational hub.
 * Technical, structural, and tied directly to the data Causey aggregates.
 * Pure decoration (aria-hidden). Colors resolve to design tokens.
 */
export function HomeHeroGraphic({ className }: { className?: string }) {
  // Isometric-ish perspective: nodes laid out on a tilted plane.
  // Local nodes (left) → State hub (center) → National hub (right).
  const local = [
    { x: 78, y: 108 },
    { x: 58, y: 172 },
    { x: 94, y: 228 },
    { x: 120, y: 156 },
  ];
  const state = { x: 212, y: 172 };
  const national = { x: 336, y: 156 };

  return (
    <div
      aria-hidden="true"
      className={`animate-rise animate-rise-delay-2 pointer-events-none absolute inset-y-0 right-0 hidden select-none items-center justify-center md:flex md:left-[50%] lg:left-[46%] ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 400 320"
        fill="none"
        className="h-auto w-[min(100%,24rem)] lg:w-[26rem]"
        role="presentation"
      >
        {/* Edges: local → state */}
        {local.map((p, i) => (
          <line
            key={`e-local-${i}`}
            x1={p.x}
            y1={p.y}
            x2={state.x}
            y2={state.y}
            className="stroke-brand-blue/45"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
        ))}

        {/* Edge: state → national (the one rail that matters most) */}
        <path
          d={`M ${state.x} ${state.y} C ${state.x + 42} ${state.y - 34} ${national.x - 42} ${national.y + 22} ${national.x} ${national.y}`}
          className="stroke-brand-red"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Local event nodes — hollow, smaller, reachable */}
        {local.map((p, i) => (
          <g key={`n-local-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r="10"
              className="fill-surface stroke-brand-blue"
              strokeWidth="2"
            />
            <circle cx={p.x} cy={p.y} r="3.5" className="fill-brand-blue/70" />
          </g>
        ))}

        {/* State affiliate hub — the pivot */}
        <circle
          cx={state.x}
          cy={state.y}
          r="18"
          className="fill-brand-blue-soft stroke-brand-blue-strong"
          strokeWidth="2.5"
        />
        <circle cx={state.x} cy={state.y} r="7" className="fill-brand-blue-strong" />

        {/* National invitational hub — the destination */}
        <circle
          cx={national.x}
          cy={national.y}
          r="26"
          className="fill-accent-soft stroke-brand-red"
          strokeWidth="2.5"
        />
        <circle
          cx={national.x}
          cy={national.y}
          r="15"
          className="fill-brand-red/15 stroke-brand-red"
          strokeWidth="1.5"
        />
        <circle cx={national.x} cy={national.y} r="6.5" className="fill-brand-red" />

        {/* Labels — small, structural, lowercase-adjacent technical feel */}
        <text
          x={58}
          y="262"
          className="fill-muted-strong"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}
        >
          Local events
        </text>
        <text
          x={state.x}
          y={state.y + 34}
          textAnchor="middle"
          className="fill-muted-strong"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}
        >
          State affiliate
        </text>
        <text
          x={national.x}
          y={national.y + 44}
          textAnchor="middle"
          className="fill-muted-strong"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}
        >
          National invitational
        </text>
      </svg>
    </div>
  );
}
