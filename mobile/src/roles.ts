/**
 * The first tab for each account type. Coaches and students are not visitors
 * on the Family tab, so every redirect resolves the role's own home instead of
 * a hardcoded "/family".
 */
export type HomeRoute = "/family" | "/plan" | "/team";

export function homeRouteForRole(role: string | null | undefined): HomeRoute {
  if (role === "coach") return "/team";
  if (role === "student") return "/plan";
  return "/family";
}
