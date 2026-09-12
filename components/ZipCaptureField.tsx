"use client";

import { useState } from "react";
import { attemptAction } from "@/lib/attempt-action";
import { requestNearestZip } from "@/lib/browser-zip";

type LocatedZip = { zip: string; state: string | null };

export function UseLocationControl({
  id = "location",
  disabled,
  onLocated,
}: {
  id?: string;
  disabled?: boolean;
  onLocated: (location: LocatedZip) => void | Promise<void>;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  async function useLocation() {
    setLocateError(null);
    setLocating(true);
    try {
      const result = await attemptAction(() => requestNearestZip());
      if (!result.ok) {
        setLocateError(result.error);
        return;
      }
      await onLocated({ zip: result.zip, state: result.state });
    } finally {
      setLocating(false);
    }
  }

  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="text-xs font-semibold text-brand-blue hover:text-brand-blue-strong hover:underline disabled:opacity-60"
        onClick={useLocation}
        disabled={disabled || locating}
        aria-describedby={locateError ? errorId : undefined}
      >
        {locating ? "Finding location…" : "Use my location"}
      </button>
      {locateError ? (
        <p id={errorId} className="text-2xs text-error" role="alert">
          {locateError}
        </p>
      ) : null}
    </div>
  );
}

export function ZipCaptureField({
  id = "zip",
  value,
  onChange,
  disabled,
  describedBy,
  helper = "Used to show tournaments near you. Optional.",
  onLocated,
  showLocationControl = true,
}: {
  id?: string;
  value: string;
  onChange: (zip: string) => void;
  disabled?: boolean;
  describedBy?: string;
  helper?: string;
  onLocated?: (zip: string, state: string | null) => void | Promise<void>;
  showLocationControl?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-strong">Zip</span>
      <input
        id={id}
        className="field"
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="\d{5}"
        maxLength={5}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="5-digit zip"
        aria-describedby={
          [describedBy, helper ? `${id}-help` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {showLocationControl ? (
          <UseLocationControl
            id={`${id}-location`}
            disabled={disabled}
            onLocated={async (location) => {
              onChange(location.zip);
              await onLocated?.(location.zip, location.state);
            }}
          />
        ) : null}
        {helper ? (
          <span id={`${id}-help`} className="text-2xs text-muted">
            {helper}
          </span>
        ) : null}
      </div>
    </div>
  );
}
