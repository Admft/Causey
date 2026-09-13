/** Confirmation phrase shown on founder org-delete forms. */
export function districtDeleteConfirmationPhrase(slug: string): string {
  return `DELETE ${slug}`;
}

function normalizeOrgDeleteConfirmation(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/_/g, "-").toUpperCase();
}

/** Underscore vs hyphen and letter case should not block a matching slug. */
export function matchesOrgDeleteConfirmation(typed: string, slug: string): boolean {
  return (
    normalizeOrgDeleteConfirmation(typed) ===
    normalizeOrgDeleteConfirmation(districtDeleteConfirmationPhrase(slug))
  );
}
