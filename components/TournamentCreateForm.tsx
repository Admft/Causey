"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createTournament } from "@/lib/actions/tournaments";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

/** Blank fee = "not listed"; "0" = free — same semantics as scraped events. */
function feeToCents(raw: string): { cents: number | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { cents: null };
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return { error: "Entry fee must be a dollar amount." };
  }
  return { cents: Math.round(dollars * 100) };
}

export function TournamentCreateForm({
  orgId,
  orgSlug,
  orgState,
}: {
  orgId: string;
  orgSlug: string;
  orgState: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(orgState ?? "");
  const [zip, setZip] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [regUrl, setRegUrl] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [rated, setRated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const fee = feeToCents(entryFee);
    if ("error" in fee) {
      setError(fee.error);
      return;
    }

    setPending(true);
    try {
      const result = await createTournament({
        orgId,
        orgSlug,
        name,
        startDate,
        endDate: endDate || null,
        regDeadline: regDeadline || null,
        venueName,
        address,
        city,
        state,
        zip,
        entryFeeCents: fee.cents,
        regUrl,
        visibility,
        rated,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/event/${result.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Tournament name</span>
        <input
          className="field"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring Scholastic Open"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Start date</span>
          <input
            className="field"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">End date</span>
          <input
            className="field"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">RSVP / register by</span>
          <input
            className="field"
            type="date"
            value={regDeadline}
            max={startDate || undefined}
            onChange={(e) => setRegDeadline(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">Venue</span>
          <input
            className="field"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="School cafeteria, library…"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">Street address</span>
          <input
            className="field"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">City</span>
          <input
            className="field"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">State</span>
            <select
              className="field"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Pick</option>
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
              required
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">
            Entry fee (dollars)
          </span>
          <input
            className="field"
            inputMode="decimal"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            placeholder="Blank = not listed, 0 = free"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">
            External registration link
          </span>
          <input
            className="field"
            type="url"
            value={regUrl}
            onChange={(e) => setRegUrl(e.target.value)}
            placeholder="Leave blank to RSVP on Causey"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-muted-strong">Who can see it</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              {
                value: "private",
                label: "Private — this organization",
                description: "Only your roster (and their linked parents) can see it.",
              },
              {
                value: "public",
                label: "Public — listed on Causey",
                description: "Anyone browsing chess tournaments can find it.",
              },
            ] as const
          ).map((opt) => {
            const selected = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                aria-pressed={selected}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-brand-red/40 bg-accent-soft"
                    : "border-line bg-white hover:border-brand-red/30"
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {opt.label}
                </span>
                <span className="mt-1 block text-2xs text-muted">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={rated}
          onChange={(e) => setRated(e.target.checked)}
        />
        US Chess rated
      </label>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending ? "Creating…" : "Create tournament"}
      </button>
    </form>
  );
}
