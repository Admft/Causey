import Image from "next/image";
import type { CSSProperties } from "react";
import { CategoryGraphic } from "@/components/CategoryGraphic";
import type { DiscoveryCategory } from "@/lib/category-discovery";

/**
 * Directory hero graphic — size knob for the tablet/desktop stage.
 * Change SEARCH_HERO_GRAPHIC_SCALE only. 1 = current default.
 * Examples: 0.9 smaller · 1.05 a bit bigger · 1.1 · 1.2
 */
export const SEARCH_HERO_GRAPHIC_SCALE = 1.12;
/** @deprecated Use SEARCH_HERO_GRAPHIC_SCALE */
export const CHESS_GRAPHIC_SCALE = SEARCH_HERO_GRAPHIC_SCALE;

const STAGE_GRAPHICS: Record<
  DiscoveryCategory,
  { src: string; width: number; height: number }
> = {
  chess: { src: "/chess-pieces.png", width: 2112, height: 2016 },
  debate: { src: "/speech-debate.png", width: 806, height: 703 },
  stem: { src: "/stem.png", width: 1716, height: 1663 },
  arts: { src: "/arts.png", width: 1585, height: 1585 },
  writing: { src: "/writing.png", width: 2218, height: 1630 },
};

/**
 * Type-specific 3D mark for directory search. `compact` sits in the
 * search-card corner on phones; `stage` is the right-column PNG from iPad up.
 */
export function SearchHeroGraphic({
  category,
  variant,
}: {
  category: DiscoveryCategory;
  variant: "compact" | "stage";
}) {
  const graphic = STAGE_GRAPHICS[category];
  const s = SEARCH_HERO_GRAPHIC_SCALE;

  if (variant === "compact") {
    return (
      <div
        aria-hidden="true"
        className="mb-3 flex justify-center md:mb-0 md:hidden"
      >
        <CategoryGraphic
          category={category}
          className="search-hero-graphic h-32 w-32"
          sizes="128px"
          priority
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none hidden md:flex md:min-h-[18rem] md:items-center md:justify-center lg:min-h-[22rem]"
      style={
        {
          "--search-hero-w": `clamp(${(15 * s).toFixed(2)}rem, ${(30 * s).toFixed(2)}vw, ${(25 * s).toFixed(2)}rem)`,
        } as CSSProperties
      }
    >
      <Image
        src={graphic.src}
        alt=""
        width={graphic.width}
        height={graphic.height}
        priority
        sizes="(min-width: 1024px) 400px, 288px"
        draggable={false}
        className="search-hero-graphic h-auto w-[var(--search-hero-w)] max-w-full select-none object-contain"
      />
    </div>
  );
}

export function ChessHeroGraphic() {
  return <SearchHeroGraphic category="chess" variant="stage" />;
}

export function SpeechDebateHeroGraphic() {
  return <SearchHeroGraphic category="debate" variant="stage" />;
}

export function StemHeroGraphic() {
  return <SearchHeroGraphic category="stem" variant="stage" />;
}

export function ArtsHeroGraphic() {
  return <SearchHeroGraphic category="arts" variant="stage" />;
}

export function WritingHeroGraphic() {
  return <SearchHeroGraphic category="writing" variant="stage" />;
}
