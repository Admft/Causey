"use client";

import Image from "next/image";
import { useState } from "react";
import { CauseyLogo } from "@/components/CauseyLogo";
import { toDisplayCoverUrl } from "@/lib/cover-url";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";

function SourceCoverMark({
  source,
  compact,
}: {
  source: string;
  compact?: boolean;
}) {
  const meta = sourceByCompetitionSource(source);
  const logoClass = compact
    ? "h-16 w-16 rounded-xl"
    : "h-20 w-20 rounded-2xl";

  if (meta) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={meta.logoUrl}
          alt=""
          width={80}
          height={80}
          unoptimized
          className={logoClass}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-org-gold-soft">
      <CauseyLogo size={compact ? "sm" : "md"} />
    </div>
  );
}

/**
 * Cover for a competition. Photos fill a fixed aspect box (cropped, never
 * stretched). Missing or failed photos keep that same box and show the
 * listing source mark so grid cards stay aligned.
 */
export function CompetitionCoverImage({
  src,
  alt,
  className = "",
  aspectClass = "aspect-[16/10]",
  source,
  compact,
  sourceFallback = true,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Tailwind aspect utility; keep consistent across cards. */
  aspectClass?: string;
  /** Listing source used when the photo is missing or fails to load. */
  source?: string;
  compact?: boolean;
  /** Search keeps the source mark; homepage featured does not. */
  sourceFallback?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photoSrc = toDisplayCoverUrl(src);

  const showPhoto = Boolean(photoSrc) && failedSrc !== photoSrc;
  const showSource = !showPhoto && sourceFallback && Boolean(source);

  if (!showPhoto && !showSource) {
    if (!sourceFallback) {
      return (
        <div
          className={`relative overflow-hidden bg-surface-soft ${aspectClass} ${className}`}
        />
      );
    }
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden bg-surface-soft ${aspectClass} ${className}`}
    >
      {showPhoto ? (
        <>
          {/* Arbitrary organizer hosts — plain img avoids next/image allowlists. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc!}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(photoSrc)}
          />
        </>
      ) : showSource ? (
        <SourceCoverMark source={source!} compact={compact} />
      ) : null}
    </div>
  );
}
