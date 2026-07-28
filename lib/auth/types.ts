import { z } from "zod";

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
  description: string;
  available: boolean;
}[] = [
  {
    value: "student",
    label: "Student",
    description: "Find tournaments, save events, rate difficulty, build a profile.",
    available: true,
  },
  {
    value: "coach",
    label: "Coach / Organizer",
    description:
      "Create and host tournaments for your school, club, or team — opening soon.",
    available: false,
  },
  {
    value: "parent",
    label: "Parent",
    description: "Connect with your child and recommend events — opening soon.",
    available: false,
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
  role_unlocked: boolean;
  created_at: string;
  updated_at: string;
};
