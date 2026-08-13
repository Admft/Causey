"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type SaveCompetitionButtonProps = {
  competitionId: string;
  initiallySaved: boolean;
  signedIn: boolean;
  returnPath: string;
};

export function SaveCompetitionButton(props: SaveCompetitionButtonProps) {
  return (
    <SaveCompetitionControl
      key={`${props.competitionId}:${props.initiallySaved}`}
      {...props}
    />
  );
}

function SaveCompetitionControl({
  competitionId,
  initiallySaved,
  signedIn,
  returnPath,
}: SaveCompetitionButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="text-sm text-muted">
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          className="font-semibold text-brand-red hover:underline"
        >
          Sign in
        </Link>{" "}
        to save this tournament to your profile.
      </p>
    );
  }

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      if (saved) {
        const { error: delError } = await supabase
          .from("saved_competitions")
          .delete()
          .eq("user_id", user.id)
          .eq("competition_id", competitionId);
        if (delError) throw delError;
        setSaved(false);
      } else {
        const { error: insError } = await supabase
          .from("saved_competitions")
          .insert({ user_id: user.id, competition_id: competitionId });
        if (insError) throw insError;
        setSaved(true);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
          saved
            ? "border-brand-red/40 bg-accent-soft text-brand-red"
            : "border-line bg-white text-foreground hover:border-brand-red/40 hover:text-brand-red"
        }`}
      >
        {pending ? "…" : saved ? "Saved to profile" : "Save to profile"}
      </button>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type DifficultyRatingProps = {
  competitionId: string;
  initialScore: number | null;
  signedIn: boolean;
  returnPath: string;
};

export function DifficultyRating(props: DifficultyRatingProps) {
  return (
    <DifficultyRatingControl
      key={`${props.competitionId}:${props.initialScore ?? "none"}`}
      {...props}
    />
  );
}

function DifficultyRatingControl({
  competitionId,
  initialScore,
  signedIn,
  returnPath,
}: DifficultyRatingProps) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(initialScore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="text-sm text-muted">
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          className="font-semibold text-brand-red hover:underline"
        >
          Sign in
        </Link>{" "}
        to rate how hard this event feels (1–10).
      </p>
    );
  }

  async function rate(next: number) {
    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error: upsertError } = await supabase.from("competition_ratings").upsert(
        {
          user_id: user.id,
          competition_id: competitionId,
          score: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,competition_id" }
      );
      if (upsertError) throw upsertError;
      setScore(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-strong">
        Difficulty (1 easy – 10 hard)
      </p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => rate(n)}
            className={`h-8 w-8 rounded-md border text-xs font-semibold transition-colors disabled:opacity-60 ${
              score === n
                ? "border-brand-red/40 bg-accent-soft text-brand-red"
                : "border-line bg-white text-muted-strong hover:border-brand-red/30 hover:text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
