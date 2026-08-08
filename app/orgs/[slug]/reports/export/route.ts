import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDistrictSchoolRollup } from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to export reports." }, { status: 401 });
  }

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) {
    return NextResponse.json({ error: "District not found." }, { status: 404 });
  }
  if (view.org.type !== "district" || !view.isDistrictAdmin) {
    return NextResponse.json(
      { error: "Only district administrators can export this report." },
      { status: 403 }
    );
  }

  const rows = await getDistrictSchoolRollup(view.org.id);
  const header = [
    "School",
    "Active students",
    "Upcoming tournaments",
    "Needs RSVP",
    "Going",
    "Attended this season",
  ];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((school) =>
      [
        school.school_name,
        school.active_students,
        school.upcoming_tournaments,
        school.invitations_pending,
        school.going_count,
        school.attended_this_season,
      ]
        .map(csvCell)
        .join(",")
    ),
  ].join("\r\n");

  return new NextResponse(`\uFEFF${csv}\r\n`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${slug}-participation.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
