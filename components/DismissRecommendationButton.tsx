"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissRecommendation } from "@/lib/actions/recommendations";

export function DismissRecommendationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDismiss() {
    setPending(true);
    try {
      await dismissRecommendation(id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onDismiss}
      className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-60"
    >
      Dismiss
    </button>
  );
}
