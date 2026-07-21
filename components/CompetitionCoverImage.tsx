"use client";

import { useState } from "react";

/**
 * Optional cover for a competition. Renders nothing when the URL is missing
 * or the image fails to load — no empty frame, no broken-icon chrome.
 * Uses object-cover inside a fixed aspect box so photos are cropped, never
 * stretched.
 */
export function CompetitionCoverImage({
  src,
  alt,
  className = "",
  aspectClass = "aspect-[16/10]",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Tailwind aspect utility; keep consistent across cards. */
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div
      className={`relative overflow-hidden bg-surface-soft ${aspectClass} ${className}`}
    >
      {/* Arbitrary organizer hosts — plain img avoids next/image allowlists. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
