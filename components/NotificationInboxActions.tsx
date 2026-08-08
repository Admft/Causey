"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

export function MarkNotificationReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await markNotificationRead(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="text-xs font-semibold text-muted-strong hover:text-brand-red disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark read"}
      </button>
      {error ? (
        <span className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </span>
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
