"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";
import { createInAppNotifications } from "@/lib/actions/in-app-notifications";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const result = await createInAppNotifications([
    {
      recipientId: user.id,
      kind: "account",
      title: copy.title,
      body: copy.body,
      href: "/account#signin",
      entityType: "account",
      entityId: parsed.data,
      dedupeKey: copy.dedupe,
    },
  ]);
  return result.failures.length
    ? { ok: false, error: result.failures[0].error }
    : { ok: true };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid notification." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("recipient_id", user.id);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That notification was not found or is no longer available.",
        "You can only update your own notifications."
      ),
    };
  }
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
