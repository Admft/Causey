"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

export function NotificationInboxItem({
  id,
  href,
  unread,
  title,
  body,
}: {
  id: string;
  href: string | null;
  unread: boolean;
  title: string;
  body: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const titleClass = unread
    ? "text-sm font-semibold text-foreground group-hover:text-brand-red"
    : "text-sm font-medium text-muted-strong group-hover:text-brand-red";

  function markThen(next?: string) {
    startTransition(async () => {
      if (unread) {
        await markNotificationRead(id);
      }
      if (next) {
        router.push(next);
        return;
      }
      router.refresh();
    });
  }

  const content = (
    <>
      <span className={titleClass}>
        {unread ? "· " : ""}
        {title}
      </span>
      <span className="mt-1 block text-xs text-muted">{body}</span>
    </>
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="group block"
            onClick={(event) => {
              if (!unread) return;
              event.preventDefault();
              markThen(href);
            }}
          >
            {content}
          </Link>
        ) : unread ? (
          <button
            type="button"
            disabled={pending}
            className="group block w-full text-left disabled:opacity-60"
            onClick={() => markThen()}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </div>
      <span className="text-xs text-muted">
        {pending ? "Saving…" : unread ? "Unread" : "Read"}
      </span>
    </div>
  );
}

export function MarkAllNotificationsReadButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await markAllNotificationsRead();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="text-xs font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark all read"}
      </button>
      {error ? (
        <span className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
