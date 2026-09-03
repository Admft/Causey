import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { competitionType } from "@/lib/competition-types";
import {
  getDistrictParticipationReport,
  getOrgSeasonAttendance,
} from "@/lib/data/district";
import { getOrgBySlugForViewer } from "@/lib/data/portal";
import {
  CompetitionCategorySchema,
  type CompetitionCategory,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const raw = String(value);
  const text =
    typeof value === "string" && /^[\t\r ]*[=+\-@]/.test(raw)
      ? `'${raw}`
      : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function typeColumn(category: CompetitionCategory | null): string {
  return category ? competitionType(category).label : "All types";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const categoryParse = CompetitionCategorySchema.safeParse(
    new URL(request.url).searchParams.get("category")
  );
  const reportCategory = categoryParse.success ? categoryParse.data : null;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to export reports." }, { status: 401 });
  }

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  if (!view.isAdmin) {
    return NextResponse.json(
      { error: "Only organization administrators can export this report." },
      { status: 403 }
    );
  }

  if (view.org.type !== "district") {
    const attendanceResult = await getOrgSeasonAttendance(view.org.id);
    if (!attendanceResult.ok) {
      return NextResponse.json(
        {
          error:
            "Season attendance is temporarily unavailable. Retry from the Reports page.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" },
        }
      );
    }
    const attendance = attendanceResult.data;
    const header = [
      "Student",
      "Event",
      "Date",
      "Hosted or travel",
      "Attendance",
      "Division",
      "Place",
      "Award",
    ];
    const csv = [
      header.map(csvCell).join(","),
      ...attendance.map((row) =>
        [
          row.display_name || "Student",
          row.name,
          row.start_date,
          row.hosted ? "Hosted" : "Travel",
          row.status === "attended" ? "Attended" : "Did not attend",
          row.section_name ?? "",
          row.placement ?? "",
          row.award_label ?? "",
        ]
          .map(csvCell)
          .join(",")
      ),
    ].join("\r\n");
    return new NextResponse(`\uFEFF${csv}\r\n`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${slug}-attendance.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  if (!view.isDistrictAdmin) {
    return NextResponse.json(
      { error: "Only district administrators can export this report." },
      { status: 403 }
    );
  }

  const report = await getDistrictParticipationReport(view.org.id, reportCategory);
  if (!report.ok) {
    return NextResponse.json(
      {
        error:
          "District reporting is temporarily unavailable. Retry from the Reports page.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  const { schools, districtHosted, hostedBySchool, category } = report.data;
  const typeLabel = typeColumn(category);
  const header = [
    "Attribution",
    "Type",
    "School",
    "Active students",
    "Upcoming tournaments",
    "Needs RSVP",
    "Going",
    "Attended this season",
  ];
  const csv = [
    header.map(csvCell).join(","),
    [
      "District-hosted",
      typeLabel,
      "",
      "",
      districtHosted.upcoming_tournaments,
      districtHosted.invitations_pending,
      districtHosted.going_count,
      districtHosted.attended_this_season,
    ]
      .map(csvCell)
      .join(","),
    ...schools.map((school) =>
      [
        "School-hosted",
        typeLabel,
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
    ...hostedBySchool.map((school) =>
      [
        "District-hosted by school",
        typeLabel,
        school.school_name,
        "",
        "",
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
