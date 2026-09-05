import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/actions/result";
import { isValidJoinCode, normalizeJoinCode } from "@/lib/org-codes";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";

const NO_MATCH = "That code didn’t match an organization.";

type JoinRow = { org_slug: string; org_name: string };

/**
 * Shared join-by-code write for the website action and the phone API.
 * Same validation, rate-limit bucket, RPC, and refusal words.
 */
export async function performJoinOrgWithCode(input: {
  supabase: Pick<SupabaseClient, "rpc" | "auth">;
  code: string;
}): Promise<ActionResult<{ slug: string; name: string }>> {
  const code = normalizeJoinCode(input.code);
  if (!isValidJoinCode(code)) {
    return { ok: false, error: NO_MATCH };
  }

  const { data: userData } = await input.supabase.auth.getUser();
  const allowed = await consumeRateLimit(
    "join_code",
    await hashedRequestActorKey(userData.user?.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const { data, error } = await input.supabase.rpc("join_org_with_code", {
    p_code: code,
  });
  const row = (data as JoinRow[] | null)?.[0];
  if (error || !row) {
    const details = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
    if (details.includes("not_authenticated")) {
      return { ok: false, error: "Sign in to join an organization." };
    }
    return { ok: false, error: NO_MATCH };
  }

  return { ok: true, slug: row.org_slug, name: row.org_name };
}
