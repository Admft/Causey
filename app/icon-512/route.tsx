import { causeyAppIcon } from "@/lib/og/causey-app-icon";

export const dynamic = "force-static";

export function GET() {
  return causeyAppIcon(512);
}
