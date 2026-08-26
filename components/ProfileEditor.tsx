"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ageBandFromDateOfBirth,
  ageBandLabel,
  parseDateOnly,
} from "@/lib/auth/age-band";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  ProfileEditableFieldsSchema,
  type AgeBand,
  type Profile,
} from "@/lib/auth/types";
import {
  DISCOVERY_CATEGORIES,
  parseDiscoveryCategory,
  type DiscoveryCategory,
} from "@/lib/category-discovery";
import { ZipCaptureField } from "@/components/ZipCaptureField";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const SHORTCUT_SCHEMA_GAP_MESSAGE =
  "Tournament shortcut is temporarily unavailable. Your other profile changes were not saved either; try again later or ask the person who manages Causey access.";

function isShortcutSchemaGap(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  return message.includes("preferred_competition_category");
}

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [zip, setZip] = useState(profile.zip ?? "");
  const [interests, setInterests] = useState<Set<DiscoveryCategory>>(
    () =>
      new Set(
        profile.interests.flatMap((interest) => {
          const category = parseDiscoveryCategory(interest);
          return category ? [category] : [];
        })
      )
  );
  const [shortcut, setShortcut] = useState<DiscoveryCategory | "">(
    parseDiscoveryCategory(profile.preferred_competition_category) ?? ""
  );
  const [grade, setGrade] = useState(
    typeof profile.grade === "number" ? String(profile.grade) : ""
  );
  const [uscfId, setUscfId] = useState(profile.credential_ids.uscf ?? "");
  const [nsdaId, setNsdaId] = useState(profile.credential_ids.nsda ?? "");
  const [otherId, setOtherId] = useState(profile.credential_ids.other ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const derivedBand = useMemo((): AgeBand | null => {
    if (!dateOfBirth || !parseDateOnly(dateOfBirth)) return null;
    try {
      return ageBandFromDateOfBirth(dateOfBirth);
    } catch {
      return null;
    }
  }, [dateOfBirth]);

  function toggleInterest(category: DiscoveryCategory, checked: boolean) {
    setInterests((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(category);
      } else {
        next.delete(category);
      }
      return next;
    });
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      if (zip && !/^\d{5}$/.test(zip)) {
        throw new Error("Zip must be 5 digits.");
      }
      let ageBand: AgeBand | null = null;
      if (dateOfBirth) {
        ageBand = ageBandFromDateOfBirth(dateOfBirth);
      }
      const credential_ids: Profile["credential_ids"] = {};
      if (uscfId.trim()) credential_ids.uscf = uscfId.trim();
      if (nsdaId.trim()) credential_ids.nsda = nsdaId.trim();
      if (otherId.trim()) credential_ids.other = otherId.trim();
      const parsedGrade = grade === "" ? null : Number(grade);
      if (
        parsedGrade !== null &&
        (!Number.isInteger(parsedGrade) || parsedGrade < 0 || parsedGrade > 12)
      ) {
        throw new Error("Grade must be K through 12.");
      }
      const update = ProfileEditableFieldsSchema.parse({
        display_name: displayName,
        date_of_birth: dateOfBirth || null,
        age_band: ageBand,
        state: state || null,
        zip: zip || null,
        interests: DISCOVERY_CATEGORIES.filter((category) =>
          interests.has(category.id)
        ).map((category) => category.id),
        preferred_competition_category: shortcut || null,
        grade: parsedGrade,
        credential_ids,
        updated_at: new Date().toISOString(),
      });
      const supabase = createBrowserSupabaseClient();
      const { error: updError } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", profile.id);
      if (updError) throw updError;
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (isShortcutSchemaGap(err)) {
        setError(SHORTCUT_SCHEMA_GAP_MESSAGE);
      } else {
        setError(
          err instanceof Error ? err.message : "Could not save profile."
        );
      }
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
        <span className="text-xs font-semibold text-muted-strong">Date of birth</span>
        <input
          className="field"
          type="date"
          value={dateOfBirth}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDateOfBirth(e.target.value)}
          autoComplete="bday"
        />
        {derivedBand ? (
          <span className="text-2xs text-muted">
            Age band: {ageBandLabel(derivedBand)}
          </span>
        ) : profile.age_band && !dateOfBirth ? (
          <span className="text-2xs text-muted">
            Current age band: {ageBandLabel(profile.age_band)} — set a birth date
            to keep it accurate.
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Grade</span>
        <select
          className="field"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setSaved(false);
          }}
        >
          <option value="">Not set</option>
          {Array.from({ length: 13 }, (_, n) => (
            <option key={n} value={String(n)}>
              {n === 0 ? "K" : `Grade ${n}`}
            </option>
          ))}
        </select>
        <span className="text-2xs text-muted">
          Optional. Coaches in your clubs can see this on the roster. It is
          not a live eligibility lookup.
        </span>
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
        <ZipCaptureField
          id="profile-zip"
          value={zip}
          onChange={(next) => {
            setZip(next);
            setSaved(false);
          }}
          helper="Used for nearby search on the homepage and directories."
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-muted-strong">
          Competition interests
        </legend>
        <p className="text-2xs text-muted">
          Used to tune what Causey shows you. Choose any, or none.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DISCOVERY_CATEGORIES.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={interests.has(category.id)}
                onChange={(e) => toggleInterest(category.id, e.target.checked)}
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Tournament shortcut
        </span>
        <select
          className="field"
          value={shortcut}
          onChange={(e) => {
            setShortcut(e.target.value as DiscoveryCategory | "");
            setSaved(false);
          }}
        >
          <option value="">None</option>
          {DISCOVERY_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <span className="text-2xs text-muted">
          Adds one directory shortcut to the site header when you are signed
          in. Separate from interests; choose None for no shortcut.
        </span>
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-xs font-semibold text-muted-strong">
          Membership numbers
        </legend>
        <p className="text-2xs text-muted">
          Typed IDs only — Causey does not look up ratings or Tabroom records.
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-semibold text-muted-strong">
            US Chess ID
          </span>
          <input
            className="field"
            value={uscfId}
            maxLength={40}
            onChange={(e) => {
              setUscfId(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-semibold text-muted-strong">
            NSDA ID
          </span>
          <input
            className="field"
            value={nsdaId}
            maxLength={40}
            onChange={(e) => {
              setNsdaId(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-semibold text-muted-strong">
            Other ID
          </span>
          <input
            className="field"
            value={otherId}
            maxLength={40}
            placeholder="VEX, TAEA, school ID…"
            onChange={(e) => {
              setOtherId(e.target.value);
              setSaved(false);
            }}
          />
        </label>
      </fieldset>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-foreground" role="status">
          Profile saved.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled w-fit disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
