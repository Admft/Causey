import { z } from "zod";
import {
  CompetitionCategorySchema,
  ParticipationModeSchema,
} from "@/lib/schemas";

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
    category: CompetitionCategorySchema.default("chess"),
    customCategoryName: z
      .string()
      .trim()
      .max(80, "Keep the custom competition type under 80 characters.")
      .default("")
      .transform((value) => value || null),
    participationMode: ParticipationModeSchema.default("in_person"),
    name: z.string().trim().min(3, "Name the tournament.").max(120),
    startDate: DateString,
    endDate: DateString.nullable(),
    regDeadline: DateString.nullable(),
    venueName: z.string().trim().max(120).transform((value) => value || null),
    address: z.string().trim().max(160).transform((value) => value || null),
    city: z.string().trim().max(80),
    state: z.string().trim().toUpperCase().max(2),
    zip: z.string().trim().max(5),
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
  })
  .refine(
    (value) =>
      value.category !== "other" || Boolean(value.customCategoryName?.trim()),
    {
      message: "Name the competition type.",
      path: ["customCategoryName"],
    }
  )
  .refine(
    (value) =>
      value.category === "other" || value.customCategoryName === null,
    {
      message: "Use the custom type field only when Other is selected.",
      path: ["customCategoryName"],
    }
  )
  .refine(
    (value) =>
      value.participationMode === "online" ||
      (value.city.length >= 2 &&
        /^[A-Z]{2}$/.test(value.state) &&
        /^\d{5}$/.test(value.zip)),
    {
      message: "Enter the city, state, and 5-digit zip for this location.",
      path: ["city"],
    }
  )
  .refine(
    (value) => value.category === "chess" || value.rated === false,
    {
      message: "US Chess rating applies only to chess competitions.",
      path: ["rated"],
    }
  )
  .refine((value) => !value.regDeadline || value.regDeadline <= value.startDate, {
    message: "Registration deadline can’t be after the start date.",
    path: ["regDeadline"],
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
