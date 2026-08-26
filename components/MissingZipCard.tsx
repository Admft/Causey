"use client";

import { FormEvent, useState } from "react";
import { saveProfileZip } from "@/lib/actions/profile-location";
import { ZipCaptureField } from "@/components/ZipCaptureField";

export function MissingZipCard() {
  const [zip, setZip] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await saveProfileZip(zip.trim());
      if (!result.ok) setError(result.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="home-zip-heading"
      className="rounded-2xl border border-brand-blue/45 bg-brand-blue-soft p-4 sm:p-5"
    >
      <h2
        id="home-zip-heading"
        className="font-display text-lg font-bold text-foreground"
      >
        Add a home zip
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-strong">
        Causey uses it to show nearby listings. Share a location or type the
        5-digit zip.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <ZipCaptureField
          id="account-zip"
          value={zip}
          onChange={setZip}
          disabled={pending}
          helper="Saved on your account, not shown on public event pages."
          onLocated={async (next) => {
            setPending(true);
            setError(null);
            try {
              const result = await saveProfileZip(next);
              if (!result.ok) setError(result.error);
            } finally {
              setPending(false);
            }
          }}
        />
        {error ? (
          <p className="text-sm font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || zip.trim().length !== 5}
          className="cta-enabled w-fit disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save zip"}
        </button>
      </form>
    </section>
  );
}
