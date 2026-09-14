"use server";

import { createHash } from "node:crypto";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/result";
import {
  extractClaimCode,
  extractClaimToken,
  invitationSignupEmailMatches,
} from "@/lib/invitations/claim-path";
import { getServiceRoleClient } from "@/lib/supabase/client";

const INVITATION_UNAVAILABLE_MESSAGE =
  "This invitation is no longer available. Return to the claim page and request a new invitation if needed.";
const INVITATION_EMAIL_MESSAGE =
  "Use the exact email address this invitation was sent to.";
const INVITATION_CHECK_FAILED_MESSAGE =
  "Could not verify this invitation. Return to the claim page and try again.";

type SignupGateInput = {
  next?: string;
  email?: string;
};

export async function assertSignupAllowed(
  input?: SignupGateInput
): Promise<ActionResult> {
  const allowed = await consumeRateLimit(
    "signup",
    await hashedRequestActorKey()
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  if (!input?.next) return { ok: true };
  if (
    input.next.length > 512 ||
    !input.email ||
    input.email.length > 320
  ) {
    return { ok: false, error: INVITATION_EMAIL_MESSAGE };
  }

  const token = extractClaimToken(input.next);
  const code = extractClaimCode(input.next);
  if (!token && !code) return { ok: true };

  const service = getServiceRoleClient();
  if (!service) {
    return { ok: false, error: INVITATION_CHECK_FAILED_MESSAGE };
  }

  const hash = createHash("sha256")
    .update(token ?? code ?? "")
    .digest("hex");
  const hashColumn = token ? "token_hash" : "activation_code_hash";
  const { data, error } = await service
    .from("org_invitations")
    .select("email, status, expires_at")
    .eq(hashColumn, hash)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Invitation signup email preflight failed:", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: INVITATION_CHECK_FAILED_MESSAGE };
  }
  if (
    !data ||
    data.status !== "pending" ||
    Date.parse(data.expires_at) <= Date.now()
  ) {
    return { ok: false, error: INVITATION_UNAVAILABLE_MESSAGE };
  }
  if (!invitationSignupEmailMatches(input.email, data.email)) {
    return { ok: false, error: INVITATION_EMAIL_MESSAGE };
  }

  return { ok: true };
}
