/**
 * Local-only product layouts (`/billing`, `/portals`).
 * Vercel production and preview always 404 these surfaces so checkout
 * and custom-host routing cannot go live from a deploy. No Stripe SDK.
 */
export const BILLING_PREVIEW_PATH = "/billing";
export const PORTAL_PREVIEW_PATH = "/portals";

export function isLocalPreviewEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.VERCEL) return false;
  if (env.CAUSEY_BILLING_PREVIEW === "1") return true;
  return env.NODE_ENV !== "production";
}

/** @deprecated Use isLocalPreviewEnabled */
export const isBillingPreviewEnabled = isLocalPreviewEnabled;
