"use server";

import { z } from "zod";
import {
  DELETE_CONFIRMATION_MISMATCH,
  performDeleteOwnAccount,
} from "@/lib/account-delete";
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
    return { ok: false, error: DELETE_CONFIRMATION_MISMATCH };
  }
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  return performDeleteOwnAccount({
    supabase,
    accountEmail: user.email,
    confirmationEmail: parsed.data.confirmationEmail,
  });
}
