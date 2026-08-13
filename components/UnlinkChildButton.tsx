"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeLink } from "@/lib/actions/household";

export function UnlinkChildButton({
  childProfileId,
  childName,
}: {
  childProfileId: string;
  childName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlink() {
    setPending(true);
    setError(null);
    try {
      const result = await revokeLink(childProfileId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Could not unlink this student. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onUnlink}
          disabled={pending}
          className="font-semibold text-brand-red hover:underline disabled:opacity-60"
        >
          {pending ? "Unlinking…" : `Yes, unlink ${childName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted-strong hover:text-foreground"
        >
          Cancel
        </button>
        {error ? (
          <span className="basis-full font-medium text-brand-red" role="alert">
            {error} {childName} remains linked.
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setError(null);
        setConfirming(true);
      }}
      className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Unlink
    </button>
  );
}
