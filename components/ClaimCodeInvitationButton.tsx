"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimOrganizationInvitationByCode } from "@/lib/actions/district";
import { attemptAction } from "@/lib/attempt-action";

const autoClaimStarted = new Set<string>();

export function ClaimCodeInvitationButton({
  code,
  autoAccept = false,
}: {
  code: string;
  autoAccept?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(autoAccept);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function claim() {
    setPending(true);
    setError(null);
    try {
      const result = await attemptAction(() =>
        claimOrganizationInvitationByCode(code)
      );
      if (!result.ok) {
        setError(result.error);
        autoClaimStarted.delete(code);
        return;
      }
      router.replace(`/orgs/${result.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!autoAccept || started.current || autoClaimStarted.has(code)) {
      return;
    }
    started.current = true;
    autoClaimStarted.add(code);
    void claim();
    // Mount-only: a matching signed-in mailbox should finish the code claim
    // after signup without a second Accept click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, code]);

  return (
    <div>
      <button
        type="button"
        onClick={() => void claim()}
        disabled={pending}
        className="cta-enabled disabled:opacity-60"
      >
        {pending ? "Joining…" : "Accept invitation"}
      </button>
      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
