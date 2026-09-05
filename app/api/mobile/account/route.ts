import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DELETE_CONFIRMATION_MISMATCH,
  performDeleteOwnAccount,
} from "@/lib/account-delete";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  confirmationEmail: z.string().trim().email().max(320),
});

/**
 * Guideline 5.1.1(v): deletion has to reach every signed-in user, so this route
 * deliberately skips the age gate the other mobile routes apply — a blocked
 * under-13 account must still be able to close itself.
 */
export async function DELETE(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.user.email) {
    return NextResponse.json(
      { error: "This account has no email on file. Contact Causey." },
      { status: 400 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: DELETE_CONFIRMATION_MISMATCH },
      { status: 400 }
    );
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: DELETE_CONFIRMATION_MISMATCH },
      { status: 400 }
    );
  }

  const result = await performDeleteOwnAccount({
    supabase: auth.supabase,
    accountEmail: auth.user.email,
    confirmationEmail: parsed.data.confirmationEmail,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
