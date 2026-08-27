import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coverFetchCandidates,
  isEphemeralCoverUrl,
  isHostedCoverUrl,
  toDisplayCoverUrl,
} from "@/lib/cover-url";
import { fetchPublicBytes } from "./fetch-html";

const COVER_BUCKET = "tournament-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function sniffCoverMime(
  buf: Buffer,
  contentType: string | null | undefined
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  const mime = contentType?.split(";")[0]?.trim().toLowerCase();
  if (mime === "image/jpg") return "image/jpeg";
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
    return mime;
  }
  return null;
}

export function scrapedCoverPath(
  source: string,
  competitionId: string,
  ext: string
): string {
  const safeSource = source.replace(/[^a-z0-9_-]/gi, "-");
  return `scraped/${safeSource}/${competitionId}.${ext}`;
}

function rehostEnabled(): boolean {
  return process.env.SCRAPE_REHOST_COVERS !== "0";
}

export async function downloadCoverBytes(
  imageUrl: string
): Promise<{ buf: Buffer; mime: "image/jpeg" | "image/png" | "image/webp" } | null> {
  for (const candidate of coverFetchCandidates(imageUrl)) {
    try {
      const { buf, contentType } = await fetchPublicBytes(candidate);
      if (buf.length === 0 || buf.length > MAX_COVER_BYTES) continue;
      const mime = sniffCoverMime(buf, contentType);
      if (!mime) continue;
      return { buf, mime };
    } catch {
      continue;
    }
  }
  return null;
}

export async function rehostScrapedCover(
  client: SupabaseClient,
  imageUrl: string,
  source: string,
  competitionId: string
): Promise<string | null> {
  const downloaded = await downloadCoverBytes(imageUrl);
  if (!downloaded) return null;
  const ext = MIME_TO_EXT[downloaded.mime];
  if (!ext) return null;
  const path = scrapedCoverPath(source, competitionId, ext);
  const { error } = await client.storage.from(COVER_BUCKET).upload(path, downloaded.buf, {
    contentType: downloaded.mime,
    upsert: true,
  });
  if (error) {
    console.warn(`cover rehost failed for ${competitionId}: ${error.message}`);
    return null;
  }
  return client.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Keep a durable card photo. Signed Google/Facebook URLs are copied into
 * tournament-covers while the token still serves; dead tokens are dropped
 * so the source mark shows instead of a broken <img>.
 */
export async function resolvePersistedCoverUrl(opts: {
  incoming: string | null | undefined;
  existing: string | null | undefined;
  client: SupabaseClient;
  source: string;
  competitionId: string;
}): Promise<string | null> {
  const incoming = toDisplayCoverUrl(opts.incoming) ?? opts.incoming ?? null;
  const existing = opts.existing ?? null;

  if (isHostedCoverUrl(existing) && isEphemeralCoverUrl(incoming)) {
    if (!rehostEnabled()) return existing;
    const hosted = await rehostScrapedCover(
      opts.client,
      incoming!,
      opts.source,
      opts.competitionId
    );
    return hosted ?? existing;
  }

  const preferred = incoming || existing || null;
  if (!preferred) return null;
  if (isHostedCoverUrl(preferred) || !isEphemeralCoverUrl(preferred)) {
    return preferred;
  }
  if (!rehostEnabled()) return preferred;
  const hosted = await rehostScrapedCover(
    opts.client,
    preferred,
    opts.source,
    opts.competitionId
  );
  if (hosted) return hosted;
  return isHostedCoverUrl(existing) ? existing : null;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
