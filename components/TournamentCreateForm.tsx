"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createTournament, updateTournament } from "@/lib/actions/tournaments";

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

function formatDate(value: string): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

/** Prefill values when editing an existing tournament. */
export type TournamentFormInitial = {
  name: string;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  venue_name: string | null;
  address: string | null;
  city: string;
  state: string;
  zip: string;
  entry_fee_cents: number | null;
  reg_url: string | null;
  visibility: "public" | "private";
  rated: boolean;
};

export function TournamentCreateForm({
  orgId,
  orgSlug,
  orgState,
  initial,
  edit,
}: {
  orgId: string;
  orgSlug: string;
  orgState: string | null;
  initial?: TournamentFormInitial;
  edit?: { competitionId: string; eventSlug: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [regDeadline, setRegDeadline] = useState(initial?.reg_deadline ?? "");
  const [venueName, setVenueName] = useState(initial?.venue_name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? orgState ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [entryFee, setEntryFee] = useState(
    initial && initial.entry_fee_cents !== null
      ? String(initial.entry_fee_cents / 100)
      : ""
  );
  const [regUrl, setRegUrl] = useState(initial?.reg_url ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">(
    initial?.visibility ?? "private"
  );
  const [rated, setRated] = useState(initial?.rated ?? false);
  const [step, setStep] = useState<"details" | "review">("details");
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

    if (!edit && step === "details") {
      setStep("review");
      return;
    }

    setPending(true);
    try {
      const fields = {
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
      };
      const result = edit
        ? await updateTournament({
            competitionId: edit.competitionId,
            eventSlug: edit.eventSlug,
            orgSlug,
            ...fields,
          })
        : await createTournament({ orgId, orgSlug, ...fields });
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

  const reviewing = !edit && step === "review";
  const fee = feeToCents(entryFee);
  const feeSummary =
    "error" in fee
      ? "Check the entry fee"
      : fee.cents === null
        ? "Not listed"
        : fee.cents === 0
          ? "Free"
          : `$${(fee.cents / 100).toFixed(2)}`;
  const locationSummary = [
    venueName.trim(),
    address.trim(),
    [city.trim(), state, zip.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const audienceChooser = (
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
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!edit ? (
        <div aria-live="polite">
          <p className="text-xs font-semibold text-brand-red">
            Step {reviewing ? "2" : "1"} of 2
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {reviewing ? "Review and choose the audience" : "Add tournament details"}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {reviewing
              ? "Confirm what families will see, then publish the event."
              : "Add the schedule, location, and registration information first."}
          </p>
        </div>
      ) : null}

      {!reviewing ? (
        <>
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

          {edit ? audienceChooser : null}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={rated}
              onChange={(e) => setRated(e.target.checked)}
            />
            US Chess rated
          </label>
        </>
      ) : (
        <>
          <section aria-labelledby="tournament-review-heading">
            <h3
              id="tournament-review-heading"
              className="font-display text-xl font-bold tracking-tight text-foreground"
            >
              {name}
            </h3>
            <dl className="mt-4 grid gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted-strong">When</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(startDate)}
                  {endDate && endDate !== startDate ? ` to ${formatDate(endDate)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Register by</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {regDeadline ? formatDate(regDeadline) : "No deadline listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Where</dt>
                <dd className="mt-1 text-sm text-foreground">{locationSummary}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Entry fee</dt>
                <dd className="mt-1 text-sm text-foreground">{feeSummary}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Registration</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {regUrl.trim() ? "External registration link" : "RSVP on Causey"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Rating</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {rated ? "US Chess rated" : "Not listed as rated"}
                </dd>
              </div>
            </dl>
          </section>

          {audienceChooser}

          <p className="text-sm text-muted">
            Publishing creates the event page immediately. You can edit or cancel it later.
          </p>
        </>
      )}

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      {reviewing ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("details");
            }}
            className="self-start text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            ← Edit details
          </button>
          <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
            {pending ? "Publishing…" : "Publish tournament"}
          </button>
        </div>
      ) : (
        <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
          {pending ? "Saving…" : edit ? "Save changes" : "Review tournament"}
        </button>
      )}
    </form>
  );
}
