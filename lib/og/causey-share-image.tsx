import { readFile } from "node:fs/promises";
import { join } from "node:path";
import React from "react";
import { ImageResponse } from "next/og";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_ALT = "Causey";
export const SHARE_IMAGE_TYPE = "image/png";

export async function causeyShareImage() {
  const font = await readFile(
    join(process.cwd(), "app/fonts/SourceSerif4-Semibold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f9fc",
          gap: 36,
        }}
      >
        <svg width="200" height="200" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#c23b32" />
          <path
            d="M21.5 11.2a7 7 0 1 0 0 9.6"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontFamily: "Source Serif 4",
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "#14181c",
            lineHeight: 1,
          }}
        >
          Causey
        </div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        {
          name: "Source Serif 4",
          data: font,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
