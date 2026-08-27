import { CategoryGlyph } from "@/components/CategoryGlyph";
import type { DiscoveryCategory } from "@/lib/category-discovery";

/**
 * Compact category mark for directory search heroes. Replaces the old
 * decorative PNG overlays so the first viewport stays a filled search card.
 */
export function SearchHeroMark({
  category,
}: {
  category: DiscoveryCategory;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-soft text-foreground"
    >
      <CategoryGlyph category={category} className="h-6 w-6" />
    </span>
  );
}

export function ChessHeroGraphic() {
  return <SearchHeroMark category="chess" />;
}

export function SpeechDebateHeroGraphic() {
  return <SearchHeroMark category="debate" />;
}

export function StemHeroGraphic() {
  return <SearchHeroMark category="stem" />;
}

export function ArtsHeroGraphic() {
  return <SearchHeroMark category="arts" />;
}

export function WritingHeroGraphic() {
  return <SearchHeroMark category="writing" />;
}
