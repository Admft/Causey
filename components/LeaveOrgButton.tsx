"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveOrg } from "@/lib/actions/orgs";

export function LeaveOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLeave() {
    setError(null);
    setPending(true);
    try {
      const result = await leaveOrg(orgId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/orgs?left=1");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="font-semibold text-brand-red hover:underline disabled:opacity-60"
        >
          {pending ? "Leaving…" : `Yes, leave ${orgName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted-strong hover:text-foreground"
        >
          Cancel
        </button>
        {error ? (
          <span className="font-medium text-brand-red" role="alert">
            {error} You’re still a member.
          </span>
        ) : (
          <span className="basis-full text-xs text-muted">
            You’ll return to My organizations. Join another club from there, or
            open Plan.
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Leave organization
    </button>
  );
}
