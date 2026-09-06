"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getSessionUser } from "@/lib/auth/session";
import {
  getSupportInboxEmail,
  hasProductEmailConfig,
} from "@/lib/email/config";
import { flushPendingInvitationEmails } from "@/lib/email/delivery";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import { getServiceRoleClient } from "@/lib/supabase/client";
import {
  SUPPORT_ATTACHMENT_BUCKET,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_REPORT_MAX_BODY,
  isSupportAttachmentType,
  supportAttachmentExtension,
  truncateSupportAlertBody,
} from "@/lib/support";

const EmailSchema = z.string().trim().email().max(320);

const SubmitSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Describe the problem.")
    .max(
      SUPPORT_REPORT_MAX_BODY,
      `Keep the description under ${SUPPORT_REPORT_MAX_BODY} characters.`
    ),
  email: EmailSchema,
  pageLabel: z.string().trim().max(200).optional(),
});

const ReplySchema = z.object({
  reportId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply.")
    .max(
      SUPPORT_REPORT_MAX_BODY,
      `Keep the reply under ${SUPPORT_REPORT_MAX_BODY} characters.`
    ),
});

function missingDatabaseError(): { ok: false; error: string } {
  return {
    ok: false,
    error: "Problem reports need a connected database.",
  };
}

async function queueSupportEmail(input: {
  recipientEmail: string;
  template: "support_intake" | "support_reply";
  payload: Record<string, unknown>;
  dedupeKey: string;
}): Promise<boolean> {
  const service = getServiceRoleClient();
  if (!service) return false;
  const { error } = await service.from("email_outbox").upsert(
    {
      recipient_email: input.recipientEmail,
      template: input.template,
      payload: input.payload,
      dedupe_key: input.dedupeKey,
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true }
  );
  if (error) {
    console.error("Support email queue failed:", error.message);
    return false;
  }
  return true;
}

export async function submitSupportReport(input: {
  body: string;
  email: string;
  pageLabel?: string;
  screenshot?: File | null;
}): Promise<ActionResult<{ emailConfigured: boolean }>> {
  const parsed = SubmitSchema.safeParse({
    body: input.body,
    email: input.email,
    pageLabel: input.pageLabel || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the report.",
    };
  }

  const screenshot = input.screenshot ?? null;
  if (screenshot && screenshot.size > 0) {
    if (screenshot.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      return { ok: false, error: "Keep the screenshot under 4 MB." };
    }
    if (!isSupportAttachmentType(screenshot.type)) {
      return {
        ok: false,
        error: "Screenshots must be a JPEG, PNG, or WebP image.",
      };
    }
  }

  const user = await getSessionUser();
  const allowed = await consumeRateLimit(
    "support",
    await hashedRequestActorKey(user?.id ?? null)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const service = getServiceRoleClient();
  if (!service) return missingDatabaseError();

  const reporterEmail = parsed.data.email.toLowerCase();
  const pageLabel = parsed.data.pageLabel || null;

  const { data: report, error: insertError } = await service
    .from("support_reports")
    .insert({
      reporter_user_id: user?.id ?? null,
      reporter_email: reporterEmail,
      body: parsed.data.body,
      page_label: pageLabel,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !report) {
    return {
      ok: false,
      error: actionErrorMessage(
        insertError,
        "Could not save the problem report."
      ),
    };
  }

  let attachmentPath: string | null = null;
  if (screenshot && screenshot.size > 0) {
    const path = `${report.id}/${randomUUID()}.${supportAttachmentExtension(
      screenshot.type
    )}`;
    const { error: uploadError } = await service.storage
      .from(SUPPORT_ATTACHMENT_BUCKET)
      .upload(path, Buffer.from(await screenshot.arrayBuffer()), {
        contentType: screenshot.type,
        upsert: false,
      });
    if (uploadError) {
      console.error("Support screenshot upload failed:", uploadError.message);
    } else {
      attachmentPath = path;
      const { error: pathError } = await service
        .from("support_reports")
        .update({ attachment_path: path })
        .eq("id", report.id);
      if (pathError) {
        console.error("Support screenshot path save failed:", pathError.message);
      }
    }
  }

  const { error: messageError } = await service
    .from("support_report_messages")
    .insert({
      report_id: report.id,
      author_role: "reporter",
      author_id: user?.id ?? null,
      body: parsed.data.body,
    });
  if (messageError) {
    return {
      ok: false,
      error: actionErrorMessage(
        messageError,
        "Could not save the problem report."
      ),
    };
  }

  const emailConfigured = hasProductEmailConfig();
  if (emailConfigured) {
    await queueSupportEmail({
      recipientEmail: getSupportInboxEmail(),
      template: "support_intake",
      payload: {
        report_id: report.id,
        reporter_email: reporterEmail,
        body: parsed.data.body,
        page_label: pageLabel ?? undefined,
        attachment_path: attachmentPath ?? undefined,
        reply_to: reporterEmail,
      },
      dedupeKey: `support-intake:${report.id}`,
    });
    await flushPendingInvitationEmails();
  }

  revalidatePath("/support");
  revalidatePath("/admin/support");
  return { ok: true, emailConfigured };
}

export async function replyToSupportReport(input: {
  reportId: string;
  body: string;
}): Promise<ActionResult> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }
  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the reply.",
    };
  }

  const service = getServiceRoleClient();
  if (!service) return missingDatabaseError();

  const { data: report, error: loadError } = await service
    .from("support_reports")
    .select("id, reporter_user_id, reporter_email, status")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (loadError || !report) {
    return {
      ok: false,
      error: actionErrorMessage(loadError, "That report was not found."),
    };
  }

  const { data: message, error: messageError } = await service
    .from("support_report_messages")
    .insert({
      report_id: report.id,
      author_role: "staff",
      author_id: admin.id,
      body: parsed.data.body,
    })
    .select("id")
    .maybeSingle();
  if (messageError || !message) {
    return {
      ok: false,
      error: actionErrorMessage(messageError, "Could not save the reply."),
    };
  }

  if (report.status !== "closed") {
    const { error: statusError } = await service
      .from("support_reports")
      .update({ status: "replied" })
      .eq("id", report.id);
    if (statusError) {
      return {
        ok: false,
        error: actionErrorMessage(statusError, "Could not update the report."),
      };
    }
  }

  const alertBody = truncateSupportAlertBody(parsed.data.body);
  let notificationId: string | undefined;
  if (report.reporter_user_id) {
    const dedupeKey = `support-reply:${report.id}:${message.id}`;
    const fanout = await createInAppNotifications([
      {
        recipientId: report.reporter_user_id,
        kind: "account",
        title: "Reply to your problem report",
        body: alertBody,
        href: "/support#reports",
        entityType: "support_report",
        entityId: report.id,
        dedupeKey,
      },
    ]);
    if (fanout.failures.length) {
      return { ok: false, error: fanout.failures[0].error };
    }
    const { data: notification } = await service
      .from("notifications")
      .select("id")
      .eq("recipient_id", report.reporter_user_id)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    notificationId = notification?.id;
    if (notificationId) {
      await service
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", notificationId);
    }
  }

  if (hasProductEmailConfig()) {
    await queueSupportEmail({
      recipientEmail: report.reporter_email,
      template: "support_reply",
      payload: {
        report_id: report.id,
        body: parsed.data.body,
        notification_id: notificationId,
        reply_to: getSupportInboxEmail(),
      },
      dedupeKey: `support-reply:${message.id}`,
    });
    await flushPendingInvitationEmails();
  }

  revalidatePath("/support");
  revalidatePath("/me/notifications");
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${report.id}`);
  return { ok: true };
}

export async function closeSupportReport(input: {
  reportId: string;
}): Promise<ActionResult> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }
  const parsed = z.object({ reportId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That report was not found." };
  }
  const service = getServiceRoleClient();
  if (!service) return missingDatabaseError();
  const { data, error } = await service
    .from("support_reports")
    .update({ status: "closed" })
    .eq("id", parsed.data.reportId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Could not close the report."),
    };
  }
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${parsed.data.reportId}`);
  return { ok: true };
}
