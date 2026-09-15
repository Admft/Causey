"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveOrg } from "@/lib/actions/orgs";
import { attemptAction } from "@/lib/attempt-action";

function leaveVerb(orgType?: string): string {
  if (orgType === "school") return "Leave this school";
  if (orgType === "district") return "Leave this district";
  if (orgType === "team") return "Leave this team";
  if (orgType === "club") return "Leave this club";
  return "Leave organization";
}

function leaveConfirmHelp(orgType?: string): string {
  if (orgType === "school" || orgType === "district") {
    return "You’ll return to Your organizations. Claim another invitation from there, or open Plan.";
  }
  if (orgType === "club" || orgType === "team") {
    return "You’ll return to Your organizations. Join another club or team from there, or open Plan.";
  }
  return "You’ll return to My organizations. Join another school or club from there, or open Plan.";
}

export function LeaveOrgButton({
  orgId,
  orgName,
  orgType,
}: {
  orgId: string;
  orgName: string;
  orgType?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLeave() {
    setError(null);
    setPending(true);
    try {
      const result = await attemptAction(() => leaveOrg(orgId));
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
          className="action-button action-button--reversal"
        >
          {pending ? "Leaving…" : `Yes, leave ${orgName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="action-button"
        >
          Cancel
        </button>
        {error ? (
          <span className="font-medium text-brand-red" role="alert">
            {error} You’re still a member.
          </span>
        ) : (
          <span className="basis-full text-xs text-muted">
            {leaveConfirmHelp(orgType)}
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="action-button action-button--reversal"
    >
      {leaveVerb(orgType)}
    </button>
  );
}
