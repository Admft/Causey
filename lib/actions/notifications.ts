"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import {
  isNotificationKind,
  type NotificationKind,
} from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  recipientId: z.string().uuid(),
  kind: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(1000),
  href: z.string().trim().max(500).nullable().optional(),
  entityType: z.string().trim().max(80).nullable().optional(),
  entityId: z.string().trim().max(120).nullable().optional(),
  dedupeKey: z.string().trim().max(240).nullable().optional(),
});

export type CreateInAppNotificationInput = {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

/**
 * Inserts one in-app notification via prefs-aware RPC. Never touches email.
 * Safe to call after invite/RSVP/announcement/account events.
 */
export async function createInAppNotification(
  input: CreateInAppNotificationInput
): Promise<ActionResult<{ id: string | null }>> {
  if (!isNotificationKind(input.kind)) {
    return { ok: false, error: "Invalid notification kind." };
  }
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification payload." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_in_app_notification", {
    p_recipient_id: parsed.data.recipientId,
    p_kind: parsed.data.kind,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_href: parsed.data.href ?? null,
    p_entity_type: parsed.data.entityType ?? null,
    p_entity_id: parsed.data.entityId ?? null,
    p_dedupe_key: parsed.data.dedupeKey ?? null,
  });
  if (error) {
    return { ok: false, error: "Could not create the in-app update." };
  }
  revalidatePath("/me/notifications");
  return { ok: true, id: (data as string | null) ?? null };
}

export async function createInAppNotifications(
  inputs: CreateInAppNotificationInput[]
): Promise<void> {
  for (const input of inputs) {
    await createInAppNotification(input);
  }
}

const AccountAlertSchema = z.enum([
  "password_updated",
  "email_change_pending",
  "password_reset_requested",
]);

export async function recordAccountInAppAlert(
  kind: z.infer<typeof AccountAlertSchema>
): Promise<ActionResult> {
  const parsed = AccountAlertSchema.safeParse(kind);
  if (!parsed.success) return { ok: false, error: "Invalid account alert." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const copy = {
    password_updated: {
      title: "Password updated",
      body: "Your Causey sign-in password was changed. Use it the next time you sign in.",
      dedupe: `account:password-updated:${new Date().toISOString().slice(0, 10)}`,
    },
    email_change_pending: {
      title: "Confirm your new email",
      body: "Check the confirmation link we sent before the new address becomes your sign-in.",
      dedupe: `account:email-change:${new Date().toISOString().slice(0, 13)}`,
    },
    password_reset_requested: {
      title: "Password reset email requested",
      body: "If your account email is correct, we sent a reset link to that address.",
      dedupe: `account:password-reset:${new Date().toISOString().slice(0, 13)}`,
    },
  }[parsed.data];

  return createInAppNotification({
    recipientId: user.id,
    kind: "account",
    title: copy.title,
    body: copy.body,
    href: "/account#signin",
    entityType: "account",
    entityId: parsed.data,
    dedupeKey: copy.dedupe,
  });
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid notification." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id);
  if (error) return { ok: false, error: "Could not update the notification." };
  revalidatePath("/me/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: "Could not update notifications." };
  revalidatePath("/me/notifications");
  return { ok: true };
}
