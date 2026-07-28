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

  async function onUnlink() {
    setPending(true);
    try {
      await revokeLink(childProfileId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
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
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Unlink
    </button>
  );
}
