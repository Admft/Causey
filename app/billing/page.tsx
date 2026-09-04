import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BillingPreview } from "@/components/BillingPreview";
import {
  BILLING_PREVIEW_PATH,
  isLocalPreviewEnabled,
} from "@/lib/local-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Club billing preview",
  description:
    "Local layout for a future club or team subscription. Checkout is not connected.",
  robots: { index: false, follow: false },
};

export default function BillingPreviewPage() {
  if (!isLocalPreviewEnabled()) notFound();

  return <BillingPreview path={BILLING_PREVIEW_PATH} />;
}
