import React from "react";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#c23b32",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#c23b32" />
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
    size
  );
}
