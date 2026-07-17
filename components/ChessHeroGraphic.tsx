import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Hero chess pieces — size knob.
 * Change CHESS_GRAPHIC_SCALE only. 1 = current default.
 * Examples: 0.9 smaller · 1.05 a bit bigger · 1.1 · 1.2
 */
export const CHESS_GRAPHIC_SCALE = 1;

/** Vertical nudge in rem. Positive = lower. */
const OFFSET_Y_REM = 0.375;

/** Base width at scale 1. Phones hide the graphic; iPad uses tablet; PC uses desktop. */
const BASE = {
  tablet: { minRem: 14, vw: 26, maxRem: 18 },
  desktop: { minRem: 23.51, vw: 31.8, maxRem: 26.05 },
} as const;

function clampWidth(minRem: number, vw: number, maxRem: number, scale: number) {
  return `clamp(${(minRem * scale).toFixed(2)}rem, ${(vw * scale).toFixed(2)}vw, ${(maxRem * scale).toFixed(2)}rem)`;
}

/**
 * Decorative hero image. Hidden on phones, shown from iPad (md+) up,
 * fuller size on desktop (lg+). Tune size via CHESS_GRAPHIC_SCALE above.
 */
export function ChessHeroGraphic() {
  const s = CHESS_GRAPHIC_SCALE;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden items-center justify-center md:flex md:left-[52%] lg:left-[46%]"
      style={
        {
          "--chess-w-md": clampWidth(BASE.tablet.minRem, BASE.tablet.vw, BASE.tablet.maxRem, s),
          "--chess-w-lg": clampWidth(BASE.desktop.minRem, BASE.desktop.vw, BASE.desktop.maxRem, s),
          "--chess-y": `${OFFSET_Y_REM}rem`,
        } as CSSProperties
      }
    >
      <Image
        src="/chess-pieces.png"
        alt=""
        width={2112}
        height={2016}
        priority
        sizes="(min-width: 1280px) 407px, (min-width: 1024px) 375px, (min-width: 768px) 288px, 0px"
        draggable={false}
        className="h-auto w-[var(--chess-w-md)] max-w-[78%] translate-y-[var(--chess-y)] select-none md:max-w-[85%] lg:w-[var(--chess-w-lg)] lg:max-w-[90%]"
      />
    </div>
  );
}
