"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinOrgWithCode } from "@/lib/actions/orgs";
import { attemptAction } from "@/lib/attempt-action";

/** Single-tap join on the /join/[code] deep-link page. */
export function JoinByCodeButton({
  code,
  orgName,
}: {
  code: string;
  orgName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onJoin() {
    setError(null);
    setPending(true);
    try {
      const result = await attemptAction(() => joinOrgWithCode(code));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orgs/${result.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onJoin}
        disabled={pending}
        className="cta-enabled disabled:opacity-60"
      >
        {pending ? "Joining…" : `Join ${orgName}`}
      </button>
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
