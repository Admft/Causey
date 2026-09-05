import React from "react";
import { ImageResponse } from "next/og";

/**
 * `brand` is the full-bleed store/home-screen icon. `mark` floats the plate on
 * a transparent canvas (splash art), and `glyph` drops the plate entirely so an
 * Android adaptive foreground can sit on its own background layer.
 */
export type CauseyIconVariant = "brand" | "mark" | "glyph";

const ARTWORK_SCALE: Record<CauseyIconVariant, number> = {
  brand: 1,
  mark: 0.78,
  glyph: 0.6,
};

/** Red C mark on a full-bleed brand square — same geometry as the site lockup. */
export function causeyAppIcon(
  size: number,
  variant: CauseyIconVariant = "brand"
) {
  const artwork = Math.round(size * ARTWORK_SCALE[variant]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: variant === "brand" ? "#c23b32" : "transparent",
        }}
      >
        <svg width={artwork} height={artwork} viewBox="0 0 32 32">
          {variant === "glyph" ? null : (
            <rect width="32" height="32" rx="7" fill="#c23b32" />
          )}
          <path
            d="M21.5 11.2a7 7 0 1 0 0 9.6"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
