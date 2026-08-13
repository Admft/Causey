"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissRecommendation } from "@/lib/actions/recommendations";

export function DismissRecommendationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDismiss() {
    setPending(true);
    setError(null);
    try {
      const result = await dismissRecommendation(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not dismiss this recommendation. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={onDismiss}
        className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-60"
      >
        {pending ? "Dismissing…" : "Dismiss"}
      </button>
      {error ? (
        <span className="max-w-56 text-right text-xs font-medium text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
