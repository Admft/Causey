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

export type SupportReportStatus = "open" | "replied" | "closed";

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
