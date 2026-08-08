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

type EmailOutboxRow = {
  id: string;
  recipient_email: string;
  template: string;
  payload: unknown;
  dedupe_key: string | null;
  attempts: number;
};

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

function invitationRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role as OrgMemberRole] ?? role.replaceAll("_", " ");
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

  throw new Error(`Unsupported email template: ${row.template}`);
}

async function recordNotificationDelivery(
  row: EmailOutboxRow,
  errorMessage?: string
) {
  const parsed = NotificationPayload.safeParse(row.payload);
  const notificationId = parsed.success
    ? parsed.data.notification_id
    : undefined;
  if (!notificationId) return;
  const service = getServiceRoleClient();
  if (!service) return;
  await service
    .from("notifications")
    .update(
      errorMessage
        ? { email_error: errorMessage.slice(0, 500) }
        : { emailed_at: new Date().toISOString(), email_error: null }
    )
    .eq("id", notificationId);
}

export async function deliverPendingEmailOutbox(
  limit = 25
): Promise<{ claimed: number; sent: number; failed: number; skipped: boolean }> {
  if (!hasProductEmailConfig()) {
    return { claimed: 0, sent: 0, failed: 0, skipped: true };
  }

  const service = getServiceRoleClient();
  if (!service) return { claimed: 0, sent: 0, failed: 0, skipped: true };
  const { data, error } = await service.rpc("claim_email_outbox_batch", {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) throw new Error(`Could not claim email outbox: ${error.message}`);

  const rows = (data ?? []) as EmailOutboxRow[];
  if (!rows.length) {
    return { claimed: 0, sent: 0, failed: 0, skipped: false };
  }

  const config = getProductEmailConfig();
  const resend = new Resend(config.apiKey);
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const message = await messageForOutboxRow(row);
      const rendered = renderProductEmail(message);
      const { data: result, error: sendError } = await resend.emails.send(
        {
          from: config.from,
          to: [row.recipient_email],
          subject: message.subject,
          html: rendered.html,
          text: rendered.text,
        },
        {
          idempotencyKey: `causey/${row.dedupe_key ?? row.id}`.slice(0, 256),
        }
      );

      if (sendError) throw new Error(sendError.message);

      await service
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          locked_at: null,
          last_error: null,
          provider_message_id: result?.id ?? null,
        })
        .eq("id", row.id);
      await recordNotificationDelivery(row);
      sent += 1;
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Email delivery failed.";
      const retryMinutes = Math.min(60, 2 ** Math.max(1, row.attempts) * 5);
      await service
        .from("email_outbox")
        .update({
          status: "failed",
          locked_at: null,
          last_error: message.slice(0, 500),
          send_after: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
        })
        .eq("id", row.id);
      await recordNotificationDelivery(row, message);
      failed += 1;
    }
  }

  return { claimed: rows.length, sent, failed, skipped: false };
}
