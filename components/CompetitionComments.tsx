"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCompetitionComment,
  postCompetitionComment,
  reportCompetitionComment,
} from "@/lib/actions/comments";
import {
  COMPETITION_COMMENT_MAX_LENGTH,
  parseCompetitionCommentBody,
} from "@/lib/competition-comments";
import type { CompetitionCommentRow } from "@/lib/data/competition-comments";

function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CompetitionComments({
  competitionId,
  eventSlug,
  signedIn,
  canComment,
  viewerId,
  comments,
}: {
  competitionId: string;
  eventSlug: string;
  signedIn: boolean;
  canComment: boolean;
  viewerId: string | null;
  comments: CompetitionCommentRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const returnPath = `/event/${eventSlug}`;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = parseCompetitionCommentBody(body);
    if (!parsed) {
      setError("Write a comment up to 800 characters.");
      return;
    }
    setPending(true);
    try {
      const result = await postCompetitionComment({
        competitionId,
        eventSlug,
        body: parsed,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onRemove(commentId: string) {
    setError(null);
    setRemovingId(commentId);
    try {
      const result = await deleteCompetitionComment({ commentId, eventSlug });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  async function onReport(commentId: string) {
    setError(null);
    setReportingId(commentId);
    try {
      const result = await reportCompetitionComment({ commentId, eventSlug });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setReportingId(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="event-comments-heading">
      <h2
        id="event-comments-heading"
        className="font-display text-xl font-bold tracking-tight text-foreground"
      >
        Comments
        {comments.length > 0 ? (
          <span className="ml-2 text-base font-semibold text-muted-strong">
            {comments.length}
          </span>
        ) : null}
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Public notes about this listing. Do not post other students&rsquo; last
        names, emails, or phone numbers. This is not a private message thread.
      </p>

      {comments.length ? (
        <ul className="mt-5 flex flex-col border-t border-line">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-line py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {comment.authorLabel}
                </p>
                <p className="text-2xs text-muted">
                  {formatCommentTime(comment.createdAt)}
                </p>
              </div>
              {comment.hiddenAt ? (
                <p className="mt-2 text-sm text-muted">
                  Hidden after a report.
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {comment.body}
                </p>
              )}
              {viewerId && viewerId === comment.userId ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
                  disabled={removingId === comment.id}
                  onClick={() => onRemove(comment.id)}
                >
                  {removingId === comment.id ? "Removing…" : "Remove"}
                </button>
              ) : viewerId && !comment.hiddenAt ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
                  disabled={reportingId === comment.id}
                  onClick={() => onReport(comment.id)}
                >
                  {reportingId === comment.id ? "Reporting…" : "Report"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No comments yet.</p>
      )}

      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      {signedIn && canComment ? (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2">
          <label htmlFor="event-comment" className="text-xs font-semibold text-muted-strong">
            Add a comment
          </label>
          <textarea
            id="event-comment"
            className="field"
            maxLength={COMPETITION_COMMENT_MAX_LENGTH}
            value={body}
            disabled={pending}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className="text-2xs text-muted">
            {body.trim().length}/{COMPETITION_COMMENT_MAX_LENGTH}
          </p>
          <button
            type="submit"
            disabled={pending || !parseCompetitionCommentBody(body)}
            className="cta-enabled w-fit disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : signedIn ? (
        <p className="mt-5 text-sm text-muted">
          Comments are for ages 13 and up.
        </p>
      ) : (
        <p className="mt-5 text-sm text-muted">
          <Link
            href={`/login?next=${encodeURIComponent(returnPath)}`}
            className="font-semibold text-brand-red hover:underline"
          >
            Sign in
          </Link>{" "}
          to comment on this competition.
        </p>
      )}
    </section>
  );
}
