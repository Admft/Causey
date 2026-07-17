/**
 * Decorative graphic for the chess search hero: custom staunton-style
 * silhouettes — upright king, tipped pawn, leaning knight — drawn to
 * reproduce the scattered-pieces photo composition this replaced (same
 * canvas, positions, sizes, and tilts, measured from that image).
 * Pure decoration (aria-hidden, no motion); colors resolve to design tokens.
 */

// Each piece is drawn upright in its own local box, then placed by
// center / scale / rotation on the 309x368 canvas.

// PAWN: local 100 x 176
const PAWN_PARTS = (
  <>
    <circle cx={50} cy={30} r={26} />
    <rect x={27} y={57} width={46} height={12} rx={6} />
    <path d="M 41 68 C 41 96 39 112 33 130 L 67 130 C 61 112 59 96 59 68 z" />
    <rect x={21} y={127} width={58} height={15} rx={7.5} />
    <path d="M 25 140 C 22 152 15 160 13 168 C 12 175 16 176 22 176 L 78 176 C 84 176 88 175 87 168 C 85 160 78 152 75 140 z" />
  </>
);

// KING: local 110 x 219
const KING_PARTS = (
  <>
    <path d="M 51 0 L 59 0 L 59 8 L 67 8 L 67 16 L 59 16 L 59 26 L 51 26 L 51 16 L 43 16 L 43 8 L 51 8 z" />
    <circle cx={55} cy={34} r={8} />
    <path d="M 33 44 C 38 40 48 38 55 38 C 62 38 72 40 77 44 C 79 52 74 62 70 70 L 40 70 C 36 62 31 52 33 44 z" />
    <rect x={32} y={68} width={46} height={9} rx={4.5} />
    <rect x={35} y={77} width={40} height={8} rx={4} />
    <path d="M 44 84 C 44 112 41 132 35 152 L 75 152 C 69 132 66 112 66 84 z" />
    <rect x={30} y={149} width={50} height={12} rx={6} />
    <path d="M 33 160 C 29 176 20 188 18 198 C 17 206 22 207 28 207 L 82 207 C 88 207 93 206 92 198 C 90 188 81 176 77 160 z" />
    <rect x={16} y={203} width={78} height={16} rx={8} />
  </>
);

// KNIGHT: local 150 x 190
const KNIGHT_PARTS = (
  <>
    <rect x={38} y={139} width={74} height={15} rx={7.5} />
    <path d="M 42 152 C 38 164 30 172 28 180 C 27 188 32 190 38 190 L 112 190 C 118 190 123 188 122 180 C 120 172 112 164 108 152 z" />
    <path d="M 50 142 C 52 124 56 110 51 100 C 48 93 43 88 37 83 C 29 77 21 73 16 68 L 13.5 64 C 12.5 60 12 55 13.5 51 C 15 47.5 18 46 22 45.5 C 30 43 36 40 41 36 C 47 30 54 23 60 18 L 65 2 C 68.5 6 70.5 10 71 14 L 75 11 L 81 0 C 85 6 86 12 84 17 C 96 27 103 47 105 70 C 107 96 104 122 99 142 z" />
  </>
);
// Face details cut out in the page background color.
const KNIGHT_CUTS = (
  <>
    <circle cx={46} cy={44} r={3.3} className="fill-background" />
    <ellipse cx={17.5} cy={56} rx={2.2} ry={3.2} className="fill-background" />
    <path d="M 13.5 63 L 24 64.5 L 14.5 67 z" className="fill-background" />
  </>
);

// [canvas center x, center y, scale, rotation] and each piece's local center,
// matched to the photo this graphic reproduces.
const PLACE = {
  king: { c: [158, 104, 0.75, -14], l: [55, 109.5] },
  pawn: { c: [243, 168, 1.1, 28], l: [50, 88] },
  knight: { c: [126, 266, 0.98, -33], l: [75, 95] },
} as const;

function transform(name: keyof typeof PLACE): string {
  const { c, l } = PLACE[name];
  const [cx, cy, s, r] = c;
  const [lx, ly] = l;
  return `translate(${cx - lx * s} ${cy - ly * s}) scale(${s}) rotate(${r} ${lx} ${ly})`;
}

export function ChessPiecesGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 309 368"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform={transform("king")} className="fill-foreground">
        {KING_PARTS}
      </g>
      <g transform={transform("pawn")} className="fill-foreground">
        {PAWN_PARTS}
      </g>
      <g transform={transform("knight")} className="fill-foreground">
        {KNIGHT_PARTS}
        {KNIGHT_CUTS}
      </g>
    </svg>
  );
}
