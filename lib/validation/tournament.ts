import { z } from "zod";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date.");
const SectionInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name each section.").max(80),
    minRating: z.number().int().nonnegative().nullable(),
    maxRating: z.number().int().nonnegative().nullable(),
    minGrade: z.number().int().min(0).max(12).nullable(),
    maxGrade: z.number().int().min(0).max(12).nullable(),
    entryFeeCents: z.number().int().nonnegative().nullable(),
  })
  .refine(
    (section) =>
      section.minRating === null ||
      section.maxRating === null ||
      section.minRating <= section.maxRating,
    { message: "Section minimum rating can’t exceed its maximum.", path: ["maxRating"] }
  )
  .refine(
    (section) =>
      section.minGrade === null ||
      section.maxGrade === null ||
      section.minGrade <= section.maxGrade,
    { message: "Section minimum grade can’t exceed its maximum.", path: ["maxGrade"] }
  );

const TournamentFieldsSchema = z
  .object({
    name: z.string().trim().min(3, "Name the tournament.").max(120),
    startDate: DateString,
    endDate: DateString.nullable(),
    regDeadline: DateString.nullable(),
    venueName: z.string().trim().max(120).transform((value) => value || null),
    address: z.string().trim().max(160).transform((value) => value || null),
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
    audience: z
      .enum(["public", "district", "school", "invite_only"])
      .optional(),
    sections: z.array(SectionInputSchema).min(1).max(20).optional(),
    rated: z.boolean(),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date can’t be before the start date.",
    path: ["endDate"],
  });

export const TournamentCreateSchema = z.intersection(
  TournamentFieldsSchema,
  z.object({
    orgId: z.string().uuid(),
    orgSlug: z.string().min(1),
  })
);

export const TournamentUpdateSchema = z.intersection(
  TournamentFieldsSchema,
  z.object({
    competitionId: z.string().uuid(),
    eventSlug: z.string().min(1),
    orgSlug: z.string().min(1),
  })
);

export type TournamentCreateInput = z.input<typeof TournamentCreateSchema>;
export type TournamentCreateValues = z.output<typeof TournamentCreateSchema>;
export type TournamentUpdateInput = z.input<typeof TournamentUpdateSchema>;
export type TournamentUpdateValues = z.output<typeof TournamentUpdateSchema>;
