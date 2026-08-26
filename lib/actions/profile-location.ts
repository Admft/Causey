"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/result";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveProfileZip(
  zip: string
): Promise<ActionResult<{ zip: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to save a home zip." };
  if (!/^\d{5}$/.test(zip)) {
    return { ok: false, error: "Enter a 5-digit zip code, like 75201." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ zip, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      error: actionErrorMessage(error, "Could not save that zip."),
    };
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/family");
  revalidatePath("/orgs");
  revalidatePath("/account");
  return { ok: true, zip };
}
