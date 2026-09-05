"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";

const GENERIC_REQUEST_MESSAGE =
  "If that email belongs to a student account, they’ll see your request on their account page.";

const GENERIC_GUARDIAN_MESSAGE =
  "If that email belongs to a parent account, they’ll see your request on their family page. If they don’t have an account yet, send them the signup link below.";

function revalidateHousehold() {
  revalidatePath("/me");
  revalidatePath("/account");
  revalidatePath("/family");
  revalidatePath("/me/notifications");
}

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

  const allowed = await consumeRateLimit(
    "household",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_child_link", {
    p_child_email: parsed.data,
  });
  if (error) {
    return { ok: false, error: "Only parent accounts can send link requests." };
  }

  revalidateHousehold();
  return { ok: true, message: GENERIC_REQUEST_MESSAGE };
}

/**
 * Student → parent link request, for a parent who already has an account.
 * Same blind response as the parent direction. A student who initiates is
 * disclosing their own name to the parent they chose; the school is not
 * involved either way.
 */
export async function requestGuardianLink(
  email: string
): Promise<ActionResult<{ message: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const parsed = z
    .string()
    .trim()
    .email("Enter your parent or guardian’s email.")
    .safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter an email." };
  }

  const allowed = await consumeRateLimit(
    "household",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_guardian_link", {
    p_parent_email: parsed.data,
  });
  if (error) {
    return {
      ok: false,
      error: "Only student accounts can ask a parent to link.",
    };
  }

  revalidateHousehold();
  return { ok: true, message: GENERIC_GUARDIAN_MESSAGE };
}

/**
 * Accept or end a family link from either side. The database refuses to let
 * whoever opened the request accept their own request, and notifies the other
 * participant when a link goes active.
 */
export async function respondToLink(
  counterpartyProfileId: string,
  accept: boolean
): Promise<ActionResult<{ status: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const parsed = z.string().uuid().safeParse(counterpartyProfileId);
  if (!parsed.success) {
    return { ok: false, error: "Could not update this request." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("respond_to_household_link", {
    p_counterparty_id: parsed.data,
    p_accept: accept,
  });
  if (error || typeof data !== "string") {
    return {
      ok: false,
      error: error?.message?.includes("requester_cannot_accept")
        ? "You opened this request, so the other person has to accept it."
        : "Could not update this request.",
    };
  }

  revalidateHousehold();
  return { ok: true, status: data };
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

  revalidateHousehold();
  return { ok: true };
}
