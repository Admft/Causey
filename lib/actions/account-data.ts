"use server";

import { z } from "zod";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DeleteSchema = z.object({
  confirmationEmail: z.string().trim().email().max(320),
});

export async function deleteOwnAccount(input: {
  confirmationEmail: string;
}): Promise<ActionResult> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type your email exactly to confirm deletion." };
  }
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Sign in to continue." };
  if (
    user.email.trim().toLowerCase() !==
    parsed.data.confirmationEmail.trim().toLowerCase()
  ) {
    return { ok: false, error: "Type your email exactly to confirm deletion." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    if (error.message.includes("owns_organization")) {
      return {
        ok: false,
        error:
          "Transfer ownership of every organization you own before deleting this account.",
      };
    }
    if (error.message.includes("cannot_delete_super_admin")) {
      return {
        ok: false,
        error: "Protected founder accounts cannot be deleted from Settings.",
      };
    }
    if (error.message.includes("account_has_review_history")) {
      return {
        ok: false,
        error:
          "This account has organization review history. Contact Causey to close it.",
      };
    }
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "Could not delete this account. Try again, or contact Causey."
      ),
    };
  }
  return { ok: true };
}
