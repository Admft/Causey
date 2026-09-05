import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import type { AuthedSupabase } from "@/lib/supabase/authed";

export const DELETE_CONFIRMATION_MISMATCH =
  "Type your email exactly to confirm deletion.";

/**
 * Shared by the website Settings form and the phone app's Delete account flow.
 * Apple requires deletion to be reachable in-app, so both callers must return
 * the same explanation when the database refuses.
 */
export async function performDeleteOwnAccount(input: {
  supabase: AuthedSupabase;
  accountEmail: string | null | undefined;
  confirmationEmail: string;
}): Promise<ActionResult> {
  const typed = input.confirmationEmail.trim().toLowerCase();
  const actual = input.accountEmail?.trim().toLowerCase();
  if (!actual || !typed || typed !== actual) {
    return { ok: false, error: DELETE_CONFIRMATION_MISMATCH };
  }

  const { error } = await input.supabase.rpc("delete_own_account");
  if (!error) return { ok: true };

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
