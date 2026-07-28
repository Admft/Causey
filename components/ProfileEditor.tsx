"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { AGE_BAND_OPTIONS, type AgeBand, type Profile } from "@/lib/auth/types";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [ageBand, setAgeBand] = useState<AgeBand | "">(profile.age_band ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [zip, setZip] = useState(profile.zip ?? "");
  const [chessInterest, setChessInterest] = useState(
    profile.interests.includes("chess")
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      if (zip && !/^\d{5}$/.test(zip)) {
        throw new Error("Zip must be 5 digits.");
      }
      const supabase = createBrowserSupabaseClient();
      const { error: updError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          age_band: ageBand || null,
          state: state || null,
          zip: zip || null,
          interests: chessInterest ? ["chess"] : [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (updError) throw updError;
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Display name</span>
        <input
          className="field"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Age band</span>
        <select
          className="field"
          value={ageBand}
          onChange={(e) => setAgeBand(e.target.value as AgeBand | "")}
        >
          <option value="">Not set</option>
          {AGE_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">State</span>
          <select
            className="field"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Not set</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Zip</span>
          <input
            className="field"
            value={zip}
            maxLength={5}
            onChange={(e) => setZip(e.target.value)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={chessInterest}
          onChange={(e) => setChessInterest(e.target.checked)}
        />
        Interested in chess
      </label>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-foreground">Profile saved.</p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled w-fit disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
