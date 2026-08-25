"use server";

import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/result";

export async function assertSignupAllowed(): Promise<ActionResult> {
  const allowed = await consumeRateLimit(
    "signup",
    await hashedRequestActorKey()
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };
  return { ok: true };
}
