import Image from "next/image";
import type { DiscoveryCategory } from "@/lib/category-discovery";

/**
 * Content-cropped square of each directory’s section graphic. The source
 * PNGs have uneven padding (they were composed as right-side hero overlays),
 * so these 512² marks keep Chess / Debate / STEM / Arts / Writing the same
 * visual size in the hero picker and other compact marks.
 */
const CATEGORY_GRAPHICS: Record<
  DiscoveryCategory,
  { src: string; width: number; height: number }
> = {
  chess: { src: "/category-marks/chess.png", width: 512, height: 512 },
  debate: { src: "/category-marks/debate.png", width: 512, height: 512 },
  stem: { src: "/category-marks/stem.png", width: 512, height: 512 },
  arts: { src: "/category-marks/arts.png", width: 512, height: 512 },
  writing: { src: "/category-marks/writing.png", width: 512, height: 512 },
};

export function CategoryGraphic({
  category,
  className = "h-10 w-10",
  sizes = "40px",
  priority = false,
}: {
  category: DiscoveryCategory;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const graphic = CATEGORY_GRAPHICS[category];
  return (
    <span
      aria-hidden="true"
      className={`category-graphic relative inline-block aspect-square shrink-0 ${className}`}
    >
      <Image
        src={graphic.src}
        alt=""
        width={graphic.width}
        height={graphic.height}
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
