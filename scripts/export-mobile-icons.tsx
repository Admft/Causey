/**
 * Renders the Expo app's launcher art from the same mark the website ships, so
 * the App Store icon can never drift from `lib/og/causey-app-icon.tsx`.
 *
 *   npm run icons:mobile
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  causeyAppIcon,
  type CauseyIconVariant,
} from "../lib/og/causey-app-icon";

const TARGETS: {
  file: string;
  size: number;
  variant: CauseyIconVariant;
}[] = [
  // Store + home screen. Apple requires 1024 with no alpha; Expo flattens the
  // PNG against `ios.backgroundColor` during prebuild.
  { file: "mobile/assets/icon.png", size: 1024, variant: "brand" },
  { file: "mobile/assets/splash-icon.png", size: 1024, variant: "mark" },
  {
    file: "mobile/assets/android-icon-foreground.png",
    size: 432,
    variant: "glyph",
  },
  {
    file: "mobile/assets/android-icon-monochrome.png",
    size: 432,
    variant: "glyph",
  },
  { file: "mobile/assets/favicon.png", size: 48, variant: "brand" },
];

async function main() {
  for (const target of TARGETS) {
    const response = causeyAppIcon(target.size, target.variant);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(resolve(process.cwd(), target.file), bytes);
    console.log(
      `${target.file} — ${target.size}px ${target.variant} (${bytes.length} bytes)`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
