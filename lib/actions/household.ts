"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const GENERIC_REQUEST_MESSAGE =
  "If that email belongs to a student account, they’ll see your request on their account page.";

/**
 * Parent → child link request. The response is identical whether or not the
 * email matched a student, so this can't be used to probe for accounts.
 */
export async function requestChildLink(
  email: string
): Promise<ActionResult<{ message: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const parsed = z.string().trim().email("Enter your child’s email.").safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter an email." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_child_link", {
    p_child_email: parsed.data,
  });
  if (error) {
    return { ok: false, error: "Only parent accounts can send link requests." };
  }

  revalidatePath("/family");
  return { ok: true, message: GENERIC_REQUEST_MESSAGE };
}

/** Child accepts or declines a pending parent request. */
export async function respondToLink(
  parentProfileId: string,
  accept: boolean
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("household_links")
    .update({ status: accept ? "active" : "revoked" })
    .eq("parent_profile_id", parentProfileId)
    .eq("child_profile_id", user.id)
    .select("parent_profile_id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not update this request." };
  }

  revalidatePath("/me");
  revalidatePath("/family");
  return { ok: true };
}

/** Parent revokes their own link to a child. */
export async function revokeLink(childProfileId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("household_links")
    .update({ status: "revoked" })
    .eq("parent_profile_id", user.id)
    .eq("child_profile_id", childProfileId)
    .select("child_profile_id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not unlink." };
  }

  revalidatePath("/family");
  return { ok: true };
}
