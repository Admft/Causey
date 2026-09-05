"use client";

import { useState } from "react";
import { requestNearestZip } from "@/lib/browser-zip";

export function ZipCaptureField({
  id = "zip",
  value,
  onChange,
  disabled,
  describedBy,
  helper = "Used to show tournaments near you. Optional.",
  onLocated,
}: {
  id?: string;
  value: string;
  onChange: (zip: string) => void;
  disabled?: boolean;
  describedBy?: string;
  helper?: string;
  onLocated?: (zip: string) => void | Promise<void>;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  async function useLocation() {
    setLocateError(null);
    setLocating(true);
    try {
      const result = await requestNearestZip();
      if (!result.ok) {
        setLocateError(result.error);
        return;
      }
      onChange(result.zip);
      await onLocated?.(result.zip);
    } finally {
      setLocating(false);
    }
  }

  const errorId = `${id}-locate-error`;

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
        disabled={disabled || locating}
        onChange={(event) => {
          onChange(event.target.value);
          setLocateError(null);
        }}
        placeholder="5-digit zip"
        aria-describedby={
          [describedBy, helper ? `${id}-help` : null, locateError ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="text-xs font-semibold text-brand-blue hover:text-brand-blue-strong hover:underline disabled:opacity-60"
          onClick={useLocation}
          disabled={disabled || locating}
        >
          {locating ? "Finding zip…" : "Use my location"}
        </button>
        {helper ? (
          <span id={`${id}-help`} className="text-2xs text-muted">
            {helper}
          </span>
        ) : null}
      </div>
      {locateError ? (
        <p id={errorId} className="text-2xs text-error" role="alert">
          {locateError}
        </p>
      ) : null}
    </div>
  );
}
