import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverPendingEmailOutbox } from "@/lib/email/delivery";
import { enqueueProductEmails } from "@/lib/email/enqueue";
import { hasProductEmailConfig } from "@/lib/email/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasProductEmailConfig()) {
    return NextResponse.json(
      { error: "Product email is not fully configured." },
      { status: 503 }
    );
  }

  try {
    const queued = await enqueueProductEmails();
    const delivery = await deliverPendingEmailOutbox(25);
    return NextResponse.json({ ok: true, queued, delivery });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product email worker failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
