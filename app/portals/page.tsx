import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalPreview } from "@/components/PortalPreview";
import {
  PORTAL_PREVIEW_PATH,
  isLocalPreviewEnabled,
} from "@/lib/local-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "District portal preview",
  description:
    "Local layout for a future custom school-district host. Routing is not connected.",
  robots: { index: false, follow: false },
};

export default function PortalPreviewPage() {
  if (!isLocalPreviewEnabled()) notFound();

  return <PortalPreview path={PORTAL_PREVIEW_PATH} />;
}
