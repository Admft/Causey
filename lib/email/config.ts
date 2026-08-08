import "server-only";

const DEFAULT_PUBLIC_URL = "https://app.causey.dev";

export function hasProductEmailConfig(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function getProductEmailConfig(): {
  apiKey: string;
  publicUrl: string;
  from: string;
} {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const publicUrl = (
    process.env.CAUSEY_PUBLIC_URL ?? DEFAULT_PUBLIC_URL
  ).replace(/\/+$/, "");
  const sendingDomain =
    process.env.RESEND_EMAIL_DOMAIN ?? "mail.causey.dev";
  const from =
    process.env.CAUSEY_EMAIL_FROM ?? `Causey <updates@${sendingDomain}>`;

  return { apiKey, publicUrl, from };
}

export function absoluteCauseyUrl(path: string | null | undefined): string {
  const { publicUrl } = getProductEmailConfig();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return publicUrl;
  return `${publicUrl}${path}`;
}
