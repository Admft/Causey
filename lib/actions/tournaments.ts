"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { canCreateOrg } from "@/lib/org-permissions";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date.");

const TournamentCreateSchema = z
  .object({
    orgId: z.string().uuid(),
    orgSlug: z.string().min(1),
    name: z.string().trim().min(3, "Name the tournament.").max(120),
    startDate: DateString,
    endDate: DateString.nullable(),
    regDeadline: DateString.nullable(),
    venueName: z.string().trim().max(120).transform((v) => v || null),
    address: z.string().trim().max(160).transform((v) => v || null),
    city: z.string().trim().min(2, "Enter the city.").max(80),
    state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Pick a state."),
    zip: z.string().trim().regex(/^\d{5}$/, "Zip must be 5 digits."),
    entryFeeCents: z.number().int().nonnegative().nullable(),
    regUrl: z
      .string()
      .trim()
      .url("Registration link must be a full URL.")
      .nullable()
      .or(z.literal("").transform(() => null)),
    visibility: z.enum(["public", "private"]),
    rated: z.boolean(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date can’t be before the start date.",
    path: ["endDate"],
  });

export type TournamentCreateInput = z.input<typeof TournamentCreateSchema>;

export async function createTournament(
  input: TournamentCreateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = TournamentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach / organizer accounts can create tournaments." };
  }

  const supabase = await createServerSupabaseClient();

  // Defense-in-depth: RLS also requires coach powers on the org.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, created_by")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };

  // Geo from the public zips table — radius search needs real coordinates.
  const { data: zipRow } = await supabase
    .from("zips")
    .select("lat, lng")
    .eq("zip", values.zip)
    .maybeSingle();
  if (!zipRow) {
    return {
      ok: false,
      error: "We don’t recognize that zip code — double-check it.",
    };
  }

  const base = slugify(values.name, values.startDate);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: created, error } = await supabase
      .from("competitions")
      .insert({
        slug,
        name: values.name,
        category: "chess",
        organizer_name: org.name,
        venue_name: values.venueName,
        address: values.address,
        city: values.city,
        state: values.state,
        zip: values.zip,
        lat: zipRow.lat,
        lng: zipRow.lng,
        start_date: values.startDate,
        end_date: values.endDate,
        reg_deadline: values.regDeadline,
        reg_url: values.regUrl,
        entry_fee_cents: values.entryFeeCents,
        rated: values.rated,
        rating_system: "uschess",
        source: "organizer",
        status: "published",
        visibility: values.visibility,
        org_id: values.orgId,
        created_by: profile.id,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue; // slug taken — retry with suffix
      return { ok: false, error: "Could not create the tournament. Try again." };
    }

    // One open section by default; eligibility splits are a later edit.
    await supabase.from("sections").insert({
      competition_id: created.id,
      name: "Open",
    });

    if (values.visibility === "public") revalidatePath("/chess");
    revalidatePath(`/orgs/${values.orgSlug}`);
    return { ok: true, slug: created.slug };
  }
  return { ok: false, error: "A tournament with that name and date already exists." };
}
