/** Shared limits for /support problem reports. */

export const SUPPORT_REPORT_MAX_BODY = 2000;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp";
export const SUPPORT_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const SUPPORT_ATTACHMENT_BUCKET = "support-attachments";
export const SUPPORT_BULK_CAP = 100;
export const SUPPORT_GIBBERISH_BODY_MESSAGE =
  "Write a short sentence about what went wrong.";

export const SUPPORT_REPORT_STATUSES = ["open", "replied", "closed"] as const;

export type SupportReportStatus = (typeof SUPPORT_REPORT_STATUSES)[number];

export type SupportMessageAuthorRole = "reporter" | "staff";

export function supportAttachmentExtension(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function isSupportAttachmentType(
  mime: string
): mime is (typeof SUPPORT_ATTACHMENT_TYPES)[number] {
  return (SUPPORT_ATTACHMENT_TYPES as readonly string[]).includes(mime);
}

export function truncateSupportAlertBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 1000) return trimmed;
  return `${trimmed.slice(0, 997)}...`;
}

export function parseSupportReportStatusFilter(
  value: string | undefined
): SupportReportStatus | "all" {
  if (value === "open" || value === "replied" || value === "closed") {
    return value;
  }
  return "all";
}

export function supportReportsHref(
  status: SupportReportStatus | "all" = "all"
): string {
  if (status === "all") return "/admin/support";
  return `/admin/support?status=${status}`;
}

/**
 * The Sep 2026 support spam was one mixed-case alphanumeric token with no
 * spaces. Real reports have words. A human who hits this can add a sentence.
 */
export function looksLikeGibberishSupportBody(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < 12) return false;
  if (/\s/.test(trimmed)) return false;
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) return false;
  return /[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed);
}
