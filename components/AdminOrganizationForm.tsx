"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateOrganization } from "@/lib/actions/admin";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function AdminOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"school" | "district">("school");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; slug: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreated(null);
    setPending(true);
    try {
      const result = await adminCreateOrganization({ name, type, state });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreated({ name, slug: result.slug });
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          District or school name
        </span>
        <input
          className="field"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Moffat County School District"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Type</span>
          <select
            className="field"
            value={type}
            onChange={(event) => setType(event.target.value as "school" | "district")}
          >
            <option value="school">School</option>
            <option value="district">District</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">State</span>
          <select
            className="field"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">Optional</option>
            {STATES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {created ? (
        <p className="text-sm text-muted-strong">
          Created <strong className="text-foreground">{created.name}</strong>.{" "}
          <Link
            href={`/orgs/${created.slug}`}
            className="font-semibold text-brand-red hover:underline"
          >
            Open organization
          </Link>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cta-enabled w-fit disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
