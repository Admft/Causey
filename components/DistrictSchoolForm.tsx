"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createDistrictSchool } from "@/lib/actions/district";

export function DistrictSchoolForm({
  districtId,
  districtSlug,
  defaultState,
}: {
  districtId: string;
  districtSlug: string;
  defaultState: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState(defaultState ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createDistrictSchool({
        districtId,
        districtSlug,
        name,
        state,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orgs/${result.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
      <label>
        <span className="text-xs font-semibold text-muted-strong">School name</span>
        <input
          className="field mt-1"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Lincoln Middle School"
          required
          maxLength={80}
        />
      </label>
      <label>
        <span className="text-xs font-semibold text-muted-strong">State</span>
        <input
          className="field mt-1 uppercase"
          value={state}
          onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))}
          placeholder="TX"
          required
          pattern="[A-Z]{2}"
        />
      </label>
      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending ? "Creating…" : "Create school"}
      </button>
      {error ? (
        <p className="text-sm font-medium text-brand-red sm:col-span-3" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
