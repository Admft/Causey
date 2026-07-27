import Image from "next/image";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";

/** Small provenance mark for which hub an event was scraped from. */
export function SourceBadge({ source }: { source: string }) {
  const meta = sourceByCompetitionSource(source);
  if (!meta) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-muted-strong">
      <Image
        src={meta.logoUrl}
        alt=""
        width={16}
        height={16}
        unoptimized
        className="h-4 w-4 rounded-sm"
      />
      {meta.name}
    </span>
  );
}
