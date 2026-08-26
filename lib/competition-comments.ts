/**
 * Shared comment copy and body rules. Safe for client components.
 */

export const COMPETITION_COMMENT_MAX_LENGTH = 800;
export const COMPETITION_COMMENTS_PAGE_LIMIT = 50;

export function parseCompetitionCommentBody(raw: string): string | null {
  const body = raw
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (body.length < 1 || body.length > COMPETITION_COMMENT_MAX_LENGTH) {
    return null;
  }
  return body;
}
