export const colors = {
  background: "#f5f9fc",
  foreground: "#14181c",
  muted: "#5a6570",
  mutedStrong: "#3a4450",
  surface: "#ffffff",
  surfaceSoft: "#eef3f7",
  line: "rgba(20, 24, 28, 0.1)",
  brandRed: "#c23b32",
  brandRedHover: "#a8322a",
  accentSoft: "#f8e8e6",
  fieldBorder: "rgba(20, 24, 28, 0.14)",
  error: "#dc2626",
} as const;

export const apiUrl = (
  process.env.EXPO_PUBLIC_CAUSEY_API_URL ?? "https://causey.dev"
).replace(/\/$/, "");

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const siteUrl = "https://causey.dev";
