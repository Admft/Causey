import { getDataSource } from "@/lib/data";
import { getCompetitionBySlugAuthed } from "@/lib/data/portal";
import { buildEventIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** Add-to-calendar download. Private org events resolve via the viewer's session. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const competition =
    (await getDataSource().getCompetitionBySlug(slug)) ??
    (await getCompetitionBySlugAuthed(slug));
  if (!competition) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  return new Response(buildEventIcs(competition), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
