import "server-only";

import { Resend } from "resend";
import { z } from "zod";
import { ORG_ROLE_LABELS, type OrgMemberRole } from "@/lib/auth/orgs";
import { buildClaimPath } from "@/lib/invitations/claim-path";
import { getServiceRoleClient } from "@/lib/supabase/client";
import {
  absoluteCauseyUrl,
  getProductEmailConfig,
  hasProductEmailConfig,
} from "@/lib/email/config";
import {
  renderProductEmail,
  type ProductEmailMessage,
} from "@/lib/email/template";
import { reportError } from "@/lib/observability";
import { SUPPORT_ATTACHMENT_BUCKET } from "@/lib/support";

type EmailOutboxRow = {
  id: string;
  recipient_email: string;
  template: string;
  payload: unknown;
  dedupe_key: string | null;
  attempts: number;
};

const DELIVERY_CONCURRENCY = 5;

const OrganizationInvitationPayload = z.object({
  claim_token: z.string().regex(/^[a-f0-9]{64}$/i),
  org_id: z.string().uuid(),
  role: z.string(),
  expires_at: z.string(),
});

const NotificationPayload = z.object({
  kind: z.string(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  href: z.string().startsWith("/").nullable().optional(),
  recipient_name: z.string().max(120).optional(),
  student_name: z.string().max(120).optional(),
  notification_id: z.string().uuid().optional(),
});

const SupportIntakePayload = z.object({
  report_id: z.string().uuid(),
  reporter_email: z.string().email().max(320),
  body: z.string().min(1).max(2000),
  page_label: z.string().min(1).max(200).optional(),
  attachment_path: z.string().min(1).max(500).optional(),
  reply_to: z.string().email().max(320),
});

const SupportReplyPayload = z.object({
  report_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  notification_id: z.string().uuid().optional(),
  reply_to: z.string().email().max(320).optional(),
});

function invitationRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role as OrgMemberRole] ?? role.replaceAll("_", " ");
}

function collapseEmailBody(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function signedSupportAttachmentUrl(
  path: string | undefined
): Promise<string | null> {
  if (!path) return null;
  const service = getServiceRoleClient();
  if (!service) return null;
  const { data, error } = await service.storage
    .from(SUPPORT_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function replyToForOutboxRow(row: EmailOutboxRow): string | undefined {
  if (row.template === "support_intake") {
    const parsed = SupportIntakePayload.safeParse(row.payload);
    return parsed.success ? parsed.data.reply_to : undefined;
  }
  if (row.template === "support_reply") {
    const parsed = SupportReplyPayload.safeParse(row.payload);
    return parsed.success ? parsed.data.reply_to : undefined;
  }
  return undefined;
}

async function messageForOutboxRow(
  row: EmailOutboxRow
): Promise<ProductEmailMessage> {
  if (row.template === "organization_invitation") {
    const payload = OrganizationInvitationPayload.parse(row.payload);
    const service = getServiceRoleClient();
    if (!service) throw new Error("Supabase service role is not configured.");
    const { data: org, error } = await service
      .from("organizations")
      .select("name")
      .eq("id", payload.org_id)
      .maybeSingle();
    if (error || !org) throw new Error("Invitation organization was not found.");

    const expiry = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(payload.expires_at));
    const role = invitationRoleLabel(payload.role);
    return {
      subject: `Invitation to ${org.name}`,
      preview: `Claim your ${role} invitation to ${org.name}.`,
      heading: `You’re invited to ${org.name}`,
      body: `An organization administrator invited this email address as ${role}. Claim the invitation by ${expiry}; you will sign in or create your own account before access is granted.`,
      actionLabel: "Review invitation",
      actionUrl: absoluteCauseyUrl(buildClaimPath(payload.claim_token)),
    };
  }

  if (row.template === "notification") {
    const payload = NotificationPayload.parse(row.payload);
    const guardianContext = payload.student_name
      ? `For ${payload.student_name}`
      : payload.recipient_name
        ? `For ${payload.recipient_name}`
        : undefined;
    return {
      subject: payload.student_name
        ? `${payload.student_name}: ${payload.title}`
        : payload.title,
      preview: payload.body,
      heading: payload.title,
      body: payload.body,
      actionLabel:
        payload.kind === "registration_deadline"
          ? "Review registration"
          : "Open in Causey",
      actionUrl: absoluteCauseyUrl(payload.href),
      recipientContext: guardianContext,
    };
  }

  if (row.template === "support_intake") {
    const payload = SupportIntakePayload.parse(row.payload);
    const screenshotUrl = await signedSupportAttachmentUrl(
      payload.attachment_path
    );
    const details = [
      `${payload.reporter_email} wrote: ${collapseEmailBody(payload.body)}`,
      payload.page_label ? `Page: ${payload.page_label}` : null,
      screenshotUrl ? `Screenshot: ${screenshotUrl}` : null,
      "Reply in Causey to also send an Alert when they have an account. Replying to this email only emails them.",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      subject: "New problem report",
      preview: collapseEmailBody(payload.body).slice(0, 140),
      heading: "New problem report",
      body: details,
      actionLabel: "Reply in Causey",
      actionUrl: absoluteCauseyUrl(`/admin/support/${payload.report_id}`),
    };
  }

  if (row.template === "support_reply") {
    const payload = SupportReplyPayload.parse(row.payload);
    return {
      subject: "Reply to your problem report",
      preview: collapseEmailBody(payload.body).slice(0, 140),
      heading: "Reply to your problem report",
      body: collapseEmailBody(payload.body),
      actionLabel: "Open in Causey",
      actionUrl: absoluteCauseyUrl("/support#reports"),
    };
  }

  throw new Error(`Unsupported email template: ${row.template}`);
}

async function recordNotificationDelivery(
  row: EmailOutboxRow,
  errorMessage?: string
) {
  const notificationId =
    NotificationPayload.safeParse(row.payload).success
      ? NotificationPayload.parse(row.payload).notification_id
      : SupportReplyPayload.safeParse(row.payload).success
        ? SupportReplyPayload.parse(row.payload).notification_id
        : undefined;
  if (!notificationId) return;
  const service = getServiceRoleClient();
  if (!service) throw new Error("Supabase service role is not configured.");
  const { data, error } = await service
    .from("notifications")
    .update(
      errorMessage
        ? { email_error: errorMessage.slice(0, 500) }
        : { emailed_at: new Date().toISOString(), email_error: null }
    )
    .eq("id", notificationId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not record notification email delivery.");
  }
}

async function updateClaimedOutboxRow(
  rowId: string,
  values: Record<string, unknown>
) {
  const service = getServiceRoleClient();
  if (!service) throw new Error("Supabase service role is not configured.");
  const { data, error } = await service
    .from("email_outbox")
    .update(values)
    .eq("id", rowId)
    .eq("status", "sending")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not finalize a claimed email outbox row.");
  }
}

export async function countReadyEmailOutbox(): Promise<number> {
  const service = getServiceRoleClient();
  if (!service) return 0;
  const { data, error } = await service.rpc("count_ready_email_outbox");
  if (error) throw new Error(`Could not count email outbox: ${error.message}`);
  return Number(data ?? 0);
}

export async function deliverPendingEmailOutbox(
  limit = 25,
  options?: { invitationsOnly?: boolean }
): Promise<{ claimed: number; sent: number; failed: number; skipped: boolean }> {
  if (!hasProductEmailConfig()) {
    return { claimed: 0, sent: 0, failed: 0, skipped: true };
  }

  const service = getServiceRoleClient();
  if (!service) return { claimed: 0, sent: 0, failed: 0, skipped: true };
  const { data, error } = await service.rpc(
    options?.invitationsOnly
      ? "claim_email_outbox_invitations"
      : "claim_email_outbox_batch",
    {
      p_limit: Math.max(1, Math.min(limit, 100)),
    }
  );
  if (error) throw new Error(`Could not claim email outbox: ${error.message}`);

  const rows = (data ?? []) as EmailOutboxRow[];
  if (!rows.length) {
    return { claimed: 0, sent: 0, failed: 0, skipped: false };
  }

  const config = getProductEmailConfig();
  const resend = new Resend(config.apiKey);
  let sent = 0;
  let failed = 0;

  async function deliverRow(row: EmailOutboxRow): Promise<"sent" | "failed"> {
    try {
      const message = await messageForOutboxRow(row);
      const rendered = renderProductEmail(message);
      const replyTo = replyToForOutboxRow(row);
      const { data: result, error: sendError } = await resend.emails.send(
        {
          from: config.from,
          to: [row.recipient_email],
          subject: message.subject,
          html: rendered.html,
          text: rendered.text,
          ...(replyTo ? { replyTo } : {}),
        },
        {
          idempotencyKey: `causey/${row.dedupe_key ?? row.id}`.slice(0, 256),
        }
      );

      if (sendError) throw new Error(sendError.message);

      await updateClaimedOutboxRow(row.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        provider_message_id: result?.id ?? null,
      });
      try {
        await recordNotificationDelivery(row);
      } catch (notificationError) {
        console.error("Notification email receipt update failed:", {
          outboxId: row.id,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : "Unknown receipt update failure.",
        });
      }
      return "sent";
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Email delivery failed.";
      const retryMinutes = Math.min(60, 2 ** Math.max(1, row.attempts) * 5);
      await updateClaimedOutboxRow(row.id, {
        status: "failed",
        locked_at: null,
        last_error: message.slice(0, 500),
        send_after: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
      });
      try {
        await recordNotificationDelivery(row, message);
      } catch (notificationError) {
        console.error("Notification email failure receipt update failed:", {
          outboxId: row.id,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : "Unknown receipt update failure.",
        });
      }
      return "failed";
    }
  }

  for (let start = 0; start < rows.length; start += DELIVERY_CONCURRENCY) {
    const outcomes = await Promise.all(
      rows.slice(start, start + DELIVERY_CONCURRENCY).map(deliverRow)
    );
    for (const outcome of outcomes) {
      if (outcome === "sent") sent += 1;
      else failed += 1;
    }
  }

  return { claimed: rows.length, sent, failed, skipped: false };
}

/** Send invitation and support mail now instead of waiting for the reminder cron. */
export async function flushPendingInvitationEmails(): Promise<void> {
  if (!hasProductEmailConfig()) return;
  try {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const delivery = await deliverPendingEmailOutbox(25, {
        invitationsOnly: true,
      });
      if (delivery.skipped || delivery.claimed === 0) break;
    }
  } catch (error) {
    reportError(error, "flushPendingInvitationEmails");
  }
}
