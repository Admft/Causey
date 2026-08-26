import { NextRequest, NextResponse } from "next/server";
import zipsJson from "@/data/zips.sample.json";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import {
  isPlausibleUsCoordinate,
  nearestZipFromCoords,
} from "@/lib/nearest-zip";
import { getDataSource } from "@/lib/data";
import { getSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const BodySchema = {
  parse(raw: unknown): { lat: number; lng: number } | null {
    if (!raw || typeof raw !== "object") return null;
    const lat = Number((raw as { lat?: unknown }).lat);
    const lng = Number((raw as { lng?: unknown }).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  },
};

export async function POST(request: NextRequest) {
  const allowed = await consumeRateLimit(
    "geo",
    await hashedRequestActorKey()
  );
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let parsed: { lat: number; lng: number } | null = null;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    parsed = null;
  }
  if (!parsed || !isPlausibleUsCoordinate(parsed.lat, parsed.lng)) {
    return NextResponse.json(
      { error: "That location is outside the US zip lookup Causey uses." },
      { status: 400 }
    );
  }

  if ((process.env.DATA_SOURCE ?? "mock") === "supabase") {
    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { error: "Zip lookup is unavailable in this build." },
        { status: 503 }
      );
    }
    const { data, error } = await client.rpc("nearest_zip", {
      p_lat: parsed.lat,
      p_lng: parsed.lng,
    });
    if (error) {
      return NextResponse.json(
        { error: "Could not match that location to a zip." },
        { status: 503 }
      );
    }
    const zip = typeof data === "string" && /^\d{5}$/.test(data) ? data : null;
    if (!zip) {
      return NextResponse.json(
        { error: "Could not match that location to a zip." },
        { status: 404 }
      );
    }
    return NextResponse.json({ zip });
  }

  const sample = zipsJson as Array<{ zip: string; lat: number; lng: number }>;
  const zip = nearestZipFromCoords(parsed.lat, parsed.lng, sample);
  if (!zip) {
    return NextResponse.json(
      { error: "Could not match that location to a zip." },
      { status: 404 }
    );
  }
  // Confirm the sample zip is actually in the mock lookup table.
  const known = await getDataSource().getZip(zip);
  if (!known) {
    return NextResponse.json(
      { error: "Could not match that location to a zip." },
      { status: 404 }
    );
  }
  return NextResponse.json({ zip });
}
