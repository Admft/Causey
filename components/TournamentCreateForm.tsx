"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import {
  adminCreateTournament,
  adminUpdateTournament,
} from "@/lib/actions/admin";
import {
  createTournament,
  publishTournamentDraft,
  saveTournamentDraft,
  updateTournament,
} from "@/lib/actions/tournaments";
import type { TournamentDraftRow } from "@/lib/data/portal";
import type {
  CompetitionAudience,
  TournamentDraftData,
  TournamentSectionDraft,
} from "@/lib/schemas";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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
  audience?: CompetitionAudience;
  rated: boolean;
};

const OPEN_SECTION: TournamentSectionDraft = {
  name: "Open",
  minRating: null,
  maxRating: null,
  minGrade: null,
  maxGrade: null,
  entryFeeCents: null,
};

export function TournamentCreateForm({
  orgId,
  orgSlug,
  orgState,
  draftId,
  initialDraft,
  initial,
  edit,
  admin = false,
  returnTo,
}: {
  orgId: string;
  orgSlug: string;
  orgState: string | null;
  draftId?: string;
  initialDraft?: TournamentDraftRow;
  initial?: TournamentFormInitial;
  edit?: { competitionId: string; eventSlug: string };
  admin?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const savedDraft = initialDraft?.data;
  const [name, setName] = useState(savedDraft?.name ?? initial?.name ?? "");
  const [startDate, setStartDate] = useState(
    savedDraft?.startDate ?? initial?.start_date ?? ""
  );
  const [endDate, setEndDate] = useState(
    savedDraft?.endDate ?? initial?.end_date ?? ""
  );
  const [regDeadline, setRegDeadline] = useState(
    savedDraft?.regDeadline ?? initial?.reg_deadline ?? ""
  );
  const [venueName, setVenueName] = useState(
    savedDraft?.venueName ?? initial?.venue_name ?? ""
  );
  const [address, setAddress] = useState(
    savedDraft?.address ?? initial?.address ?? ""
  );
  const [city, setCity] = useState(savedDraft?.city ?? initial?.city ?? "");
  const [state, setState] = useState(
    savedDraft?.state ?? initial?.state ?? orgState ?? ""
  );
  const [zip, setZip] = useState(savedDraft?.zip ?? initial?.zip ?? "");
  const [entryFee, setEntryFee] = useState(
    savedDraft?.entryFee ??
      (initial && initial.entry_fee_cents !== null
        ? String(initial.entry_fee_cents / 100)
        : "")
  );
  const [regUrl, setRegUrl] = useState(
    savedDraft?.regUrl ?? initial?.reg_url ?? ""
  );
  const [visibility, setVisibility] = useState<"private" | "public">(
    savedDraft?.visibility ?? initial?.visibility ?? "private"
  );
  const [audience, setAudience] = useState<CompetitionAudience>(
    savedDraft?.audience ??
      initial?.audience ??
      (savedDraft?.visibility === "public" || initial?.visibility === "public"
        ? "public"
        : "school")
  );
  const [sections, setSections] = useState<TournamentSectionDraft[]>(
    savedDraft?.sections?.length ? savedDraft.sections : [OPEN_SECTION]
  );
  const [rated, setRated] = useState(
    savedDraft?.rated ?? initial?.rated ?? false
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialDraft?.cover_image_url ?? null
  );
  const [step, setStep] = useState<"details" | "review">("details");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >(initialDraft ? "saved" : "idle");
  const [draftError, setDraftError] = useState<string | null>(null);
  const firstAutosave = useRef(true);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const draftUrlSet = useRef(Boolean(initialDraft));
  const leaving = useRef(false);
  const published = useRef(false);
  const saveVersion = useRef(0);

  function currentDraftData(): TournamentDraftData {
    return {
      name,
      startDate,
      endDate,
      regDeadline,
      venueName,
      address,
      city,
      state,
      zip,
      entryFee,
      regUrl,
      visibility,
      audience,
      sections,
      rated,
    };
  }

  function persistDraft(coverImagePath?: string) {
    if (!draftId) {
      return Promise.resolve({
        ok: false as const,
        error: "Could not identify this draft. Reload the page and try again.",
      });
    }
    const data = currentDraftData();
    const version = ++saveVersion.current;
    setDraftStatus("saving");
    setDraftError(null);
    const request = saveQueue.current.then(async () => {
      try {
        return await saveTournamentDraft({
          draftId,
          orgId,
          data,
          coverImagePath,
        });
      } catch {
        return {
          ok: false as const,
          error: "Could not save the draft. Check your connection and try again.",
        };
      }
    });
    saveQueue.current = request.then(
      () => undefined,
      () => undefined
    );
    void request.then((result) => {
      if (version !== saveVersion.current) return;
      if (result.ok) {
        setDraftStatus("saved");
        setDraftError(null);
        if (result.coverImageUrl) setCoverImageUrl(result.coverImageUrl);
        if (!draftUrlSet.current) {
          const url = new URL(window.location.href);
          url.searchParams.set("draft", result.draftId);
          window.history.replaceState(
            window.history.state,
            "",
            `${url.pathname}${url.search}${url.hash}`
          );
          draftUrlSet.current = true;
        }
      } else {
        setDraftStatus("error");
        setDraftError(result.error);
      }
    });
    return request;
  }

  useEffect(() => {
    if (edit || admin || pending || leaving.current || published.current) return;
    if (firstAutosave.current) {
      firstAutosave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 900);
    return () => window.clearTimeout(timer);
    // Every primitive field is intentional: any organizer edit is persisted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    startDate,
    endDate,
    regDeadline,
    venueName,
    address,
    city,
    state,
    zip,
    entryFee,
    regUrl,
    visibility,
    audience,
    sections,
    rated,
    edit,
    pending,
  ]);

  async function onCoverSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP cover image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover images must be 5 MB or smaller.");
      return;
    }
    if (!draftId) {
      setError("Could not identify this draft. Reload the page and try again.");
      return;
    }

    setUploading(true);
    try {
      const saved = await persistDraft();
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const imagePath = `${orgId}/${draftId}/cover-${crypto.randomUUID()}.${extension}`;
      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("tournament-covers")
        .upload(imagePath, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        setError("Could not upload the cover image. Try a smaller image or try again.");
        return;
      }

      const attached = await persistDraft(imagePath);
      if (!attached.ok) {
        await supabase.storage.from("tournament-covers").remove([imagePath]);
        setError(attached.error);
        return;
      }
      setCoverImageUrl(attached.coverImageUrl);
    } finally {
      setUploading(false);
    }
  }

  async function saveDraftAndLeave() {
    setPending(true);
    setError(null);
    try {
      const result = await persistDraft();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      leaving.current = true;
      router.push(`/orgs/${orgSlug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

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
        audience,
        sections,
        rated,
      };
      if (edit) {
        const result = admin
          ? await adminUpdateTournament({
              competitionId: edit.competitionId,
              eventSlug: edit.eventSlug,
              orgSlug,
              ...fields,
            })
          : await updateTournament({
              competitionId: edit.competitionId,
              eventSlug: edit.eventSlug,
              orgSlug,
              ...fields,
            });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(returnTo ?? `/event/${result.slug}`);
        router.refresh();
        return;
      }

      // Platform admin create stays on the SEC-06 draft-competition path
      // (no cover upload required); coaches use resumable drafts + cover.
      if (admin) {
        const result = await adminCreateTournament({ orgId, orgSlug, ...fields });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(returnTo ?? `/event/${result.slug}`);
        router.refresh();
        return;
      }

      if (!coverImageUrl) {
        setError("Add a cover image before previewing the tournament.");
        return;
      }
      const saved = await persistDraft();
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      if (step === "details") {
        setStep("review");
        return;
      }

      if (!draftId) {
        setError("Could not identify this draft. Reload the page and try again.");
        return;
      }
      const result = await publishTournamentDraft({
        draftId,
        orgId,
        orgSlug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      published.current = true;
      router.push(returnTo ?? `/event/${result.slug}`);
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
  function updateSection(
    index: number,
    patch: Partial<TournamentSectionDraft>
  ) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section
      )
    );
  }
  function nullableInteger(raw: string): number | null {
    if (!raw) return null;
    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  }
  const audienceChooser = (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold text-muted-strong">Who can see it</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              value: "school",
              label: "School only",
              description: "Members, linked parents, and staff in this school.",
            },
            {
              value: "district",
              label: "District only",
              description: "People across the connected district and its schools.",
            },
            {
              value: "invite_only",
              label: "Invite only",
              description: "Only invited students, linked parents, and event staff.",
            },
            {
              value: "public",
              label: "Public",
              description: "Listed in discovery after platform review.",
            },
          ] as const
        ).map((opt) => {
          const selected = audience === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setAudience(opt.value);
                setVisibility(opt.value === "public" ? "public" : "private");
              }}
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
            {reviewing ? "Preview and choose the audience" : "Add tournament details"}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {reviewing
              ? "Check the event page preview, decide who can find it, then publish."
              : "Add the cover, schedule, location, and registration information."}
          </p>
        </div>
      ) : null}

      {!edit ? (
        <div className="flex flex-col items-start justify-between gap-2 border-y border-line py-3 sm:flex-row sm:items-center">
          <p
            className={`text-xs ${
              draftStatus === "error" ? "font-medium text-brand-red" : "text-muted"
            }`}
            role={draftStatus === "error" ? "alert" : "status"}
          >
            {draftStatus === "saving"
              ? "Saving draft…"
              : draftStatus === "saved"
                ? "Draft saved. You can resume it from this organization."
                : draftStatus === "error"
                  ? draftError
                  : "Your changes will save as a draft."}
          </p>
          <button
            type="button"
            onClick={saveDraftAndLeave}
            disabled={pending || uploading}
            className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
          >
            Save draft and leave
          </button>
        </div>
      ) : null}

      {!reviewing ? (
        <>
          {!edit ? (
            <fieldset className="flex flex-col gap-3">
              <div>
                <legend className="text-xs font-semibold text-muted-strong">
                  Cover image <span className="text-brand-red">Required</span>
                </legend>
                <p className="mt-1 text-xs text-muted">
                  Use a landscape JPG, PNG, or WebP up to 5 MB. The preview shows
                  the crop families will see.
                </p>
              </div>
              {coverImageUrl ? (
                <CompetitionCoverImage
                  key={coverImageUrl}
                  src={coverImageUrl}
                  alt={`Cover for ${name.trim() || "this tournament"}`}
                  aspectClass="aspect-[2/1]"
                  className="max-w-2xl rounded-2xl"
                />
              ) : (
                <div className="flex aspect-[2/1] max-w-2xl items-center justify-center rounded-2xl border border-dashed border-field-border bg-surface-soft px-5 text-center text-sm text-muted">
                  Add a real tournament photo, venue image, or event artwork.
                </div>
              )}
              <label className="inline-flex w-fit cursor-pointer items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onCoverSelected}
                  disabled={uploading || pending}
                />
                {uploading
                  ? "Uploading cover…"
                  : coverImageUrl
                    ? "Choose a different cover"
                    : "Choose cover image"}
              </label>
            </fieldset>
          ) : null}

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

          {!edit ? (
            <fieldset className="section-rule pt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <legend className="text-sm font-semibold text-foreground">
                    Tournament sections
                  </legend>
                  <p className="mt-1 text-xs text-muted">
                    Add the rating or grade splits families need before they RSVP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSections((current) => [
                      ...current,
                      { ...OPEN_SECTION, name: "" },
                    ])
                  }
                  disabled={sections.length >= 20}
                  className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
                >
                  Add section
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-line bg-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-muted-strong">
                        Section {index + 1}
                      </p>
                      {sections.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSections((current) =>
                              current.filter(
                                (_item, sectionIndex) => sectionIndex !== index
                              )
                            )
                          }
                          className="text-xs font-semibold text-muted hover:text-brand-red"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <label className="mt-3 block">
                      <span className="text-xs font-semibold text-muted-strong">
                        Section name
                      </span>
                      <input
                        className="field mt-1"
                        value={section.name}
                        onChange={(event) =>
                          updateSection(index, { name: event.target.value })
                        }
                        placeholder="K–5 U1000"
                        required
                        maxLength={80}
                      />
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-4">
                      <label>
                        <span className="text-xs font-semibold text-muted-strong">
                          Min rating
                        </span>
                        <input
                          className="field mt-1"
                          type="number"
                          min={0}
                          value={section.minRating ?? ""}
                          onChange={(event) =>
                            updateSection(index, {
                              minRating: nullableInteger(event.target.value),
                            })
                          }
                          placeholder="Any"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-semibold text-muted-strong">
                          Max rating
                        </span>
                        <input
                          className="field mt-1"
                          type="number"
                          min={0}
                          value={section.maxRating ?? ""}
                          onChange={(event) =>
                            updateSection(index, {
                              maxRating: nullableInteger(event.target.value),
                            })
                          }
                          placeholder="Any"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-semibold text-muted-strong">
                          Min grade
                        </span>
                        <input
                          className="field mt-1"
                          type="number"
                          min={0}
                          max={12}
                          value={section.minGrade ?? ""}
                          onChange={(event) =>
                            updateSection(index, {
                              minGrade: nullableInteger(event.target.value),
                            })
                          }
                          placeholder="K = 0"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-semibold text-muted-strong">
                          Max grade
                        </span>
                        <input
                          className="field mt-1"
                          type="number"
                          min={0}
                          max={12}
                          value={section.maxGrade ?? ""}
                          onChange={(event) =>
                            updateSection(index, {
                              maxGrade: nullableInteger(event.target.value),
                            })
                          }
                          placeholder="12"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}

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
            <CompetitionCoverImage
              src={coverImageUrl}
              alt={`Cover for ${name}`}
              aspectClass="aspect-[2/1]"
              className="mb-5 max-w-2xl rounded-2xl"
            />
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

          <section>
            <h3 className="text-xs font-semibold text-muted-strong">
              Sections families will see
            </h3>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {sections.map((section, index) => (
                <li key={index} className="py-2.5 text-sm text-foreground">
                  <span className="font-semibold">{section.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {[
                      section.minRating !== null || section.maxRating !== null
                        ? `rating ${section.minRating ?? "any"}–${
                            section.maxRating ?? "open"
                          }`
                        : null,
                      section.minGrade !== null || section.maxGrade !== null
                        ? `grades ${section.minGrade ?? "K"}–${
                            section.maxGrade ?? 12
                          }`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Open eligibility"}
                  </span>
                </li>
              ))}
            </ul>
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
          <button
            type="submit"
            disabled={pending || uploading}
            className="cta-enabled disabled:opacity-60"
          >
            {pending ? "Publishing…" : "Publish tournament"}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending || uploading}
          className="cta-enabled disabled:opacity-60"
        >
          {pending
            ? edit
              ? "Saving changes…"
              : admin
                ? "Creating…"
                : "Saving draft…"
            : edit
              ? "Save changes"
              : admin
                ? "Create tournament draft"
                : "Preview tournament"}
        </button>
      )}
    </form>
  );
}
