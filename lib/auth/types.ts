import { z } from "zod";
import {
  PublicCompetitionCategorySchema,
  type PublicCompetitionCategory,
} from "@/lib/schemas";

export const AccountRoleSchema = z.enum(["student", "coach", "parent"]);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

export const AgeBandSchema = z.enum(["u10", "u12", "u14", "u18", "18plus"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const AGE_BAND_OPTIONS: { value: AgeBand; label: string }[] = [
  { value: "u10", label: "Under 10" },
  { value: "u12", label: "Under 12" },
  { value: "u14", label: "Under 14" },
  { value: "u18", label: "Under 18" },
  { value: "18plus", label: "18+" },
];

export const ROLE_OPTIONS: {
  value: AccountRole;
  label: string;
  accountLabel: string;
  description: string;
}[] = [
  {
    value: "student",
    label: "Student",
    accountLabel: "student",
    description:
      "Join a school or club, answer coach invitations, and keep tournament plans together.",
  },
  {
    value: "coach",
    label: "Coach / Organizer",
    accountLabel: "coach or organizer",
    description:
      "Start a school or club roster, invite students, and publish tournaments.",
  },
  {
    value: "parent",
    label: "Parent",
    accountLabel: "parent",
    description:
      "Link to a student’s account, follow their invitations, and RSVP on their behalf.",
  },
];

export type Profile = {
  id: string;
  role: AccountRole;
  display_name: string;
  date_of_birth: string | null;
  age_band: AgeBand | null;
  state: string | null;
  zip: string | null;
  interests: string[];
  preferred_competition_category: PublicCompetitionCategory | null;
  role_unlocked: boolean;
  created_at: string;
  updated_at: string;
};

export const ProfileEditableFieldsSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  date_of_birth: z.string().date().nullable(),
  age_band: AgeBandSchema.nullable(),
  state: z.string().length(2).nullable(),
  zip: z.string().regex(/^\d{5}$/).nullable(),
  interests: z.array(PublicCompetitionCategorySchema).max(5),
  preferred_competition_category: PublicCompetitionCategorySchema.nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

export type ProfileEditableFields = z.infer<
  typeof ProfileEditableFieldsSchema
>;
