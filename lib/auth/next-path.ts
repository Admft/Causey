/** Keep post-auth redirects on Causey. */
export function sanitizeNextPath(
  next: string | null | undefined
): string | undefined {
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return undefined;
  }
  return next;
}
