import "server-only";

import type { ActionResult } from "@/lib/actions/result";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  TournamentCreateValues,
  TournamentUpdateValues,
} from "@/lib/validation/tournament";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type ZipRow = { lat: number | null; lng: number | null };

export async function getTournamentZip(
  supabase: ServerSupabase,
  zip: string
): Promise<ActionResult<ZipRow>> {
  const { data } = await supabase
    .from("zips")
    .select("lat, lng")
    .eq("zip", zip)
    .maybeSingle();

  if (!data) {
    return {
      ok: false,
      error: "We don’t recognize that zip code — double-check it.",
    };
  }

  return { ok: true, lat: data.lat, lng: data.lng };
}

export async function insertTournamentRecord(input: {
  supabase: ServerSupabase;
  values: TournamentCreateValues;
  orgName: string;
  profileId: string;
  zipRow: ZipRow;
  status: "draft" | "published";
}): Promise<ActionResult<{ slug: string }>> {
  const { supabase, values, orgName, profileId, zipRow, status } = input;
  const base = slugify(values.name, values.startDate);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: created, error } = await supabase
      .from("competitions")
      .insert({
        slug,
        name: values.name,
        category: values.category,
        custom_category_name: values.customCategoryName,
        participation_mode: values.participationMode,
        organizer_name: orgName,
        venue_name: values.venueName,
        address: values.address,
        city: values.city || null,
        state: values.state || null,
        zip: values.zip || null,
        lat: zipRow.lat,
        lng: zipRow.lng,
        start_date: values.startDate,
        end_date: values.endDate,
        reg_deadline: values.regDeadline,
        reg_url: values.regUrl,
        entry_fee_cents: values.entryFeeCents,
        rated: values.category === "chess" && values.rated,
        rating_system: values.category === "chess" ? "uschess" : null,
        source: "organizer",
        status,
        visibility: values.visibility,
        audience:
          values.audience ??
          (values.visibility === "public" ? "public" : "school"),
        org_id: values.orgId,
        created_by: profileId,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: "Could not create the competition. Try again." };
    }

    const sections = values.sections?.length
      ? values.sections
      : [
          {
            name: "Open",
            minRating: null,
            maxRating: null,
            minGrade: null,
            maxGrade: null,
            entryFeeCents: null,
          },
        ];
    const { error: sectionError } = await supabase.from("sections").insert(
      sections.map((section) => ({
        competition_id: created.id,
        name: section.name,
        min_rating: values.category === "chess" ? section.minRating : null,
        max_rating: values.category === "chess" ? section.maxRating : null,
        min_grade: section.minGrade,
        max_grade: section.maxGrade,
        entry_fee_cents: section.entryFeeCents,
      }))
    );
    if (sectionError) {
      await supabase
        .from("competitions")
        .update({ status: "archived" })
        .eq("id", created.id);
      return {
        ok: false,
        error: "The competition was archived because its default division could not be created.",
      };
    }

    return { ok: true, slug: created.slug };
  }

  return { ok: false, error: "A competition with that name and date already exists." };
}

export async function updateTournamentRecord(input: {
  supabase: ServerSupabase;
  values: TournamentUpdateValues;
  zipRow: ZipRow;
}): Promise<ActionResult<{ slug: string }>> {
  const { supabase, values, zipRow } = input;
  const sections = values.sections?.length
    ? values.sections.map((section) => ({
        name: section.name,
        min_rating:
          values.category === "chess" ? section.minRating : null,
        max_rating:
          values.category === "chess" ? section.maxRating : null,
        min_grade: section.minGrade,
        max_grade: section.maxGrade,
        entry_fee_cents: section.entryFeeCents,
      }))
    : null;
  const { data, error } = await supabase.rpc(
    "update_competition_with_sections",
    {
      p_competition_id: values.competitionId,
      p_values: {
        category: values.category,
        custom_category_name: values.customCategoryName,
        participation_mode: values.participationMode,
        name: values.name,
        venue_name: values.venueName,
        address: values.address,
        city: values.city || null,
        state: values.state || null,
        zip: values.zip || null,
        lat: zipRow.lat,
        lng: zipRow.lng,
        start_date: values.startDate,
        end_date: values.endDate,
        reg_deadline: values.regDeadline,
        reg_url: values.regUrl,
        entry_fee_cents: values.entryFeeCents,
        rated: values.category === "chess" && values.rated,
        rating_system: values.category === "chess" ? "uschess" : null,
        visibility: values.visibility,
        audience:
          values.audience ??
          (values.visibility === "public" ? "public" : "school"),
      },
      p_sections: sections,
    }
  );

  if (error || !data) {
    return { ok: false, error: "Could not save the competition and its divisions. Try again." };
  }

  return { ok: true, slug: String(data) };
}
