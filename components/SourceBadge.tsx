import Image from "next/image";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";

/** Plain-language provenance for every listing source, including org-created events. */
export function SourceBadge({
  source,
  showLogo = true,
}: {
  source: string;
  showLogo?: boolean;
}) {
  const meta = sourceByCompetitionSource(source);
  const label = meta
    ? `Listed by ${meta.name}`
    : source === "organizer"
      ? "Provided by the organizer"
      : source === "manual"
        ? "Entered in Causey"
        : null;
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-muted-strong">
      {meta && showLogo ? (
        <Image
          src={meta.logoUrl}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="h-4 w-4 rounded-sm"
        />
      ) : null}
      {label}
    </span>
  );
}
